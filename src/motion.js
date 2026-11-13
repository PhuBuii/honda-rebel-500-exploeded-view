import * as THREE from 'three';
import { config } from './config.js';
import { SWINGARM_PIVOT } from './parts/frame.js';
import { FORK_AXIS } from './parts/front-end.js';
import { partBounds } from './parts/index.js';
import { AXLE_HEIGHT, REAR_AXLE_X, WHEEL_SPEED } from './parts/wheel.js';
import { bodyPose, RIDE_SPEED, roadBumps } from './ride.js';
import { LANE_SPEED } from './slideshow.js';

const EXPLODED_LIFT = 0.62; // nâng cả xe để động cơ và ống xả bung xuống không chạm sàn
const DIM_OPACITY = 0.1;
const ACTION_FADE_SECONDS = 0.7;
const HIGHLIGHT = new THREE.Color('#f2b65a');

const RIDE_FADE_SECONDS = 0.7;
const RIDE_SPIN = RIDE_SPEED / AXLE_HEIGHT / WHEEL_SPEED; // bánh quay khớp với tốc độ mặt đường
const REAR_ARM = new THREE.Vector2(REAR_AXLE_X - SWINGARM_PIVOT[0], AXLE_HEIGHT - SWINGARM_PIVOT[1]);
const SHOCK_ARM = 0.335; // khoảng cách từ trục càng sau đến điểm bắt giảm xóc
const SHADOW_EVERY_FRAMES = 3; // bóng đổ không cần vẽ lại mỗi khung hình khi chạy, đỡ nặng cho điện thoại

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function createTweens() {
  const active = new Set();
  return {
    isActive: () => active.size > 0,
    add(seconds, onUpdate, delay = 0) {
      return new Promise((resolve) => {
        active.add({ time: -delay, seconds, onUpdate, resolve });
      });
    },
    tick(dt) {
      for (const tween of active) {
        tween.time += dt;
        if (tween.time < 0) continue;
        const t = tween.seconds > 0 ? Math.min(tween.time / tween.seconds, 1) : 1;
        tween.onUpdate(easeInOut(t));
        if (t === 1) {
          active.delete(tween);
          tween.resolve();
        }
      }
    },
  };
}

function collectMaterials(object) {
  const materials = new Set();
  object.traverse((o) => {
    if (o.isMesh && !o.userData.pickOnly && !o.userData.effect) materials.add(o.material);
  });
  return [...materials];
}

export function createMotion({ stage, parts, reducedMotion }) {
  const tweens = createTweens();
  const seconds = (s) => (reducedMotion ? Math.min(s, config.motion.reducedSeconds) : s);
  const byId = Object.fromEntries(parts.map((part) => [part.id, part]));

  const entries = parts.map((part) => ({
    part,
    materials: collectMaterials(part.object),
    baseEmissive: new Map(),
  }));
  for (const entry of entries) {
    for (const mat of entry.materials) {
      entry.baseEmissive.set(mat, { color: mat.emissive.clone(), intensity: mat.emissiveIntensity });
    }
  }

  const offsetOf = (part) => (stage.camera.aspect < 1 ? part.portraitOffset : part.explodeOffset);

  // Khung bao của cả xe khi đã lắp và khi đã bung, để máy quay vừa khít.
  const assembledBounds = entries.map(({ part }) => ({ part, box: partBounds(part.object) }));
  const assembledBox = new THREE.Box3();
  for (const { box } of assembledBounds) assembledBox.union(box);

  function explodedBox() {
    const lift = new THREE.Vector3(0, EXPLODED_LIFT, 0);
    const result = new THREE.Box3();
    for (const { part, box } of assembledBounds) {
      result.union(box.clone().translate(offsetOf(part)).translate(lift));
    }
    return result;
  }

  // Bánh xe nằm trong một nhóm riêng để hệ thống treo đẩy lên xuống, tách khỏi vị trí bung.
  const wheelMount = (part) => {
    const mount = new THREE.Group();
    stage.bike.add(mount);
    mount.add(part.object);
    return mount;
  };
  const frontMount = wheelMount(byId.frontWheel);
  const rearMount = wheelMount(byId.rearWheel);

  let explodeAmount = 0;
  let view = { mode: 'assembled' };
  let browseView = view;
  let savedPose = null;
  // Chuyển động của bộ phận đang xem; người xem bật giảm chuyển động thì không chạy.
  let running = null;
  const ride = { strength: 0, target: 0, time: 0, distance: 0, frame: 0, memory: 0, lane: 0 };
  let memoriesOn = false;

  // Khổ dọc thường nhìn xéo hơn cho xe to; khi có dải ảnh phía sau thì nhìn thẳng góc hơn,
  // nếu không dải ảnh bị lệch hẳn sang một bên và kéo khung hình rộng ra.
  const overviewDirection = (square = memoriesOn) =>
    new THREE.Vector3(...(stage.camera.aspect < 1 && !square ? [0.85, 0.2, 1] : [0.42, 0.16, 1])).normalize();

  // Khi bật ảnh kỷ niệm, máy quay lùi ra để lấy cả dải ảnh phía sau xe.
  const withMemories = (box, lift) => (memoriesOn ? box.clone().union(stage.memories.bounds(lift)) : box);
  const overviewLayout = () => (memoriesOn ? 'memories' : 'overview');
  const assembledPose = () => stage.poseFor(withMemories(assembledBox, 0), overviewDirection(), overviewLayout());
  const explodedPose = () =>
    stage.poseFor(withMemories(explodedBox(), EXPLODED_LIFT), overviewDirection(), overviewLayout(), 1.02);
  const finalePose = () => stage.poseFor(assembledBox, overviewDirection(false), 'focus');
  const browsePose = () => (browseView.mode === 'exploded' ? explodedPose() : assembledPose());

  function focusPose(part) {
    return stage.poseFor(partBounds(part.object), part.focusDirection, 'focus', 1.12);
  }

  function setExplode(k) {
    explodeAmount = k;
    stage.bike.position.y = EXPLODED_LIFT * k;
  }

  function placeParts(amountFor) {
    for (const { part } of entries) {
      part.object.position.copy(part.assembledPosition).addScaledVector(offsetOf(part), amountFor(part));
    }
  }

  function fly(to, duration = config.motion.flySeconds) {
    const from = stage.currentPose();
    return tweens.add(seconds(duration), (k) => stage.applyPose(from, to, k));
  }

  function setDim(entry, amount) {
    const opacity = 1 - (1 - DIM_OPACITY) * amount;
    for (const mat of entry.materials) {
      const dimmed = opacity < 1;
      if (mat.transparent !== dimmed) {
        mat.transparent = dimmed;
        mat.depthWrite = !dimmed;
        mat.needsUpdate = true;
      }
      mat.opacity = opacity;
    }
  }

  // Mỗi bộ phận chạy lệch nhau một nhịp, bắt đầu từ đầu danh sách khi bung, cuối danh sách khi lắp.
  function runExplode(toExploded) {
    const stagger = reducedMotion ? 0 : config.motion.staggerSeconds;
    const start = explodeAmount;
    const target = toExploded ? 1 : 0;
    const progress = new Map(entries.map(({ part }) => [part, start]));
    const update = () => placeParts((part) => progress.get(part));
    const ordered = toExploded ? entries : [...entries].reverse();
    const total = seconds(config.motion.explodeSeconds);
    const each = ordered.map(({ part }, i) =>
      tweens.add(
        total,
        (k) => {
          progress.set(part, THREE.MathUtils.lerp(start, target, k));
          update();
        },
        i * stagger,
      ),
    );
    const lift = tweens.add(total + stagger * ordered.length, (k) =>
      setExplode(THREE.MathUtils.lerp(start, target, k)),
    );
    return Promise.all([...each, lift]);
  }

  // Xe đang chạy: mặt đường đẩy hai bánh, hệ thống treo và thân xe phản ứng theo.
  // Khi đã bung, các bộ phận vẫn chạy nhưng bánh và thân xe không còn phải bám theo nhau.
  function tickRide(dt) {
    if (ride.strength === 0 && ride.target === 0) return;
    const step = dt / RIDE_FADE_SECONDS;
    ride.strength += THREE.MathUtils.clamp(ride.target - ride.strength, -step, step);
    ride.time += dt;
    const s = ride.strength;
    const { front, rear } = roadBumps(ride.time);
    const frontRise = front * s;
    const rearRise = rear * s;
    const swing = -rearRise / REAR_ARM.length();

    byId.fork.drive.setTravel(frontRise / FORK_AXIS.y);
    byId.shock.drive.setTravel(rearRise * (SHOCK_ARM / REAR_ARM.length()));
    byId.frame.drive.setSwing(swing);

    const attached = 1 - explodeAmount;
    frontMount.position.copy(FORK_AXIS).multiplyScalar((frontRise / FORK_AXIS.y) * attached);
    const arm = REAR_ARM.clone().rotateAround(new THREE.Vector2(), swing).sub(REAR_ARM);
    rearMount.position.set(arm.x * attached, arm.y * attached, 0);

    const pose = bodyPose(frontRise, rearRise);
    const vibration = 0.0012 * Math.sin(ride.time * 70) * s;
    stage.bike.position.y = EXPLODED_LIFT * explodeAmount + (pose.y + vibration) * attached;
    stage.bike.rotation.z = pose.pitch * attached;

    byId.frontWheel.action(ride.time, s, dt * RIDE_SPIN);
    byId.rearWheel.action(ride.time, s, dt * RIDE_SPIN);
    byId.headlight.action(ride.time, s, dt);
    byId.handlebar.action(ride.time, s * 0.1, dt);
    for (const part of [byId.engine, byId.exhaust, byId.fender]) {
      part.action(ride.time, s, dt, { reveal: false });
    }

    ride.distance += RIDE_SPEED * s * dt;
    stage.road.update(ride.distance, s);

    // Dải ảnh hiện dần cùng mặt đường, còn khi tắt ảnh thì mờ dần trong lúc xe vẫn chạy.
    ride.memory += THREE.MathUtils.clamp((memoriesOn ? 1 : 0) - ride.memory, -step, step);
    ride.lane += LANE_SPEED * s * dt;
    stage.memories.update(ride.time, ride.lane, s * ride.memory, EXPLODED_LIFT * explodeAmount);

    ride.frame += 1;
    if (s === 0 || ride.frame % SHADOW_EVERY_FRAMES === 0) stage.renderer.shadowMap.needsUpdate = true;
  }

  return {
    tick(dt) {
      if (tweens.isActive()) stage.renderer.shadowMap.needsUpdate = true;
      tweens.tick(dt);
      tickRide(dt);
      if (running) {
        running.time += dt;
        running.part.action(running.time, running.strength, dt);
      }
    },

    showAssembled() {
      setExplode(0);
      placeParts(() => 0);
      const pose = assembledPose();
      stage.applyPose(pose, pose, 1);
      stage.controls.enabled = false;
      stage.controls.autoRotate = !reducedMotion;
      view = { mode: 'assembled' };
      browseView = view;
    },

    // Chuyển sang một cách xem: 'assembled' là nguyên xe, 'exploded' là đã tách.
    async showLayout(layout) {
      stage.controls.enabled = false;
      stage.controls.autoRotate = false;
      const exploded = layout === 'exploded';
      view = { mode: exploded ? 'exploded' : 'assembled' };
      browseView = view;
      await Promise.all([
        runExplode(exploded),
        fly(exploded ? explodedPose() : assembledPose(), config.motion.explodeSeconds),
      ]);
      stage.controls.enabled = true;
    },

    async assemble() {
      stage.controls.enabled = false;
      view = { mode: 'finale' };
      await Promise.all([runExplode(false), fly(finalePose(), config.motion.explodeSeconds)]);
      stage.controls.autoRotate = !reducedMotion;
    },

    setRiding(on) {
      ride.target = on && !reducedMotion ? 1 : 0;
    },

    // Bật hoặc tắt ảnh kỷ niệm; máy quay bay đến khung hình mới nếu đang ở cách xem toàn cảnh.
    async setMemories(on) {
      const next = Boolean(on) && stage.memories.count > 0 && !reducedMotion;
      if (next === memoriesOn) return;
      memoriesOn = next;
      if (view.mode !== 'assembled' && view.mode !== 'exploded') return;
      stage.controls.enabled = false;
      await fly(browsePose());
      stage.controls.enabled = true;
    },

    async focus(id) {
      const target = entries.find((e) => e.part.id === id);
      savedPose = stage.currentPose();
      stage.controls.enabled = false;
      view = { mode: 'focused', part: target.part };
      this.highlight(null);
      // Xe dừng lại trong lúc xem cận cảnh: chuyển động riêng của bộ phận sẽ thay vào.
      ride.target = 0;
      await Promise.all([
        fly(focusPose(target.part)),
        tweens.add(seconds(0.6), (k) => {
          for (const entry of entries) if (entry !== target) setDim(entry, k);
          stage.fadeFloorShadow(k);
        }),
      ]);
      if (reducedMotion) return;
      const action = { part: target.part, time: 0, strength: 0 };
      running = action;
      // Không chờ: thẻ lời nhắn hiện ngay trong lúc chuyển động mạnh dần lên.
      tweens.add(ACTION_FADE_SECONDS, (k) => {
        if (running === action) action.strength = k;
      });
    },

    async unfocus() {
      const closing = view.part;
      view = browseView;
      const to = savedPose ?? browsePose();
      savedPose = null;
      const action = running;
      const fadingFrom = action ? action.strength : 0;
      await Promise.all([
        fly(to),
        tweens.add(seconds(0.6), (k) => {
          for (const entry of entries) if (entry.part !== closing) setDim(entry, 1 - k);
          stage.fadeFloorShadow(1 - k);
        }),
        action &&
          tweens.add(seconds(0.5), (k) => {
            action.strength = fadingFrom * (1 - k);
          }),
      ]);
      if (action) {
        action.part.action(action.time, 0, 0);
        running = null;
      }
      stage.controls.enabled = true;
    },

    highlight(id) {
      for (const entry of entries) {
        const on = entry.part.id === id;
        for (const mat of entry.materials) {
          const base = entry.baseEmissive.get(mat);
          if (on) {
            mat.emissive.copy(HIGHLIGHT);
            mat.emissiveIntensity = Math.max(base.intensity * 0.5, 0.14);
          } else {
            mat.emissive.copy(base.color);
            mat.emissiveIntensity = base.intensity;
          }
        }
      }
    },

    // Đổi kích thước hoặc xoay điện thoại: giữ nguyên trạng thái, chỉ đặt lại máy quay.
    refit() {
      placeParts(() => explodeAmount);
      stage.renderer.shadowMap.needsUpdate = true;
      let pose;
      if (view.mode === 'assembled') pose = assembledPose();
      else if (view.mode === 'finale') pose = finalePose();
      else if (view.mode === 'focused') {
        pose = focusPose(view.part);
        savedPose = browsePose();
      } else pose = explodedPose();
      stage.applyPose(pose, pose, 1);
    },
  };
}
