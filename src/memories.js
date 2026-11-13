import * as THREE from 'three';
import { glowMaterial } from './parts/shapes.js';
import { focusAt, slotCount, slotPhoto, slotX } from './slideshow.js';

// Dải ảnh polaroid treo trên một sợi dây phía sau đường, trôi chậm theo xe như phần "kỷ niệm".
const CARD_W = 2.18;
const CARD_H = 2.6;
const PHOTO_H = 2.02;
const BORDER = 0.118;
const CARD_PX = 320; // điểm ảnh trên mỗi mét của ảnh dán lên khung
const PIN_Y = 3.55; // độ cao sợi dây; đủ cao để đáy ảnh to không bị xe che
const LANE_Z = -4.5; // nằm sau lưng đường: xa camera nên trôi chậm và không che xe
// Phần dải được tính khi canh khung camera. Cố ý hẹp hơn phần nhìn thấy thật: ảnh ở hai mép
// màn hình bị cắt cũng không sao vì chúng đang trôi, còn xe thì phải giữ được cỡ to.
const VISIBLE_HALF_WIDTH = 1.7;
const FOCUS_LIFT = 0.35; // ảnh ở giữa nhô về phía người xem một chút
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.2;
const TILTS = [0.05, -0.04, 0.03, -0.06, 0.045, -0.03];
const FONT = '"Patrick Hand", "Segoe Print", cursive';
const PAPER = '#f3eee2';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Không tải được ảnh ${src}`));
    image.src = src;
  });
}

// Xuống dòng theo từ, tối đa maxLines dòng; dòng cuối bị cắt thì thêm dấu ba chấm.
function wrapCaption(ctx, text, maxWidth, maxLines) {
  const lines = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(next).width <= maxWidth) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

// Vẽ cả tấm polaroid lên một canvas: giấy ảnh, ảnh cắt vừa khung và dòng chú thích bên dưới.
function drawCard(image, caption) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(CARD_W * CARD_PX);
  canvas.height = Math.round(CARD_H * CARD_PX);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const border = BORDER * CARD_PX;
  const photoW = canvas.width - border * 2;
  const photoH = PHOTO_H * CARD_PX;
  // Cắt cho vừa khung, nghiêng về phần trên vì mặt người thường nằm ở đó.
  const scale = Math.max(photoW / image.width, photoH / image.height);
  const sw = photoW / scale;
  const sh = photoH / scale;
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) * 0.35, sw, sh, border, border, photoW, photoH);
  // Cỡ chữ và nét vẽ tính theo bề rộng tấm ảnh, thiết kế ban đầu ở 520 px.
  const unit = canvas.width / 520;
  ctx.strokeStyle = 'rgba(40, 30, 20, 0.22)';
  ctx.lineWidth = 2 * unit;
  ctx.strokeRect(border, border, photoW, photoH);

  if (caption) {
    let size = 42 * unit;
    ctx.font = `${size}px ${FONT}`;
    let lines = wrapCaption(ctx, caption, photoW, 2);
    if (lines.length > 1) {
      size = 34 * unit;
      ctx.font = `${size}px ${FONT}`;
      lines = wrapCaption(ctx, caption, photoW, 2);
    }
    ctx.fillStyle = '#3b2f22';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const top = border + photoH;
    const centre = top + (canvas.height - top) / 2 - 4 * unit;
    const lineHeight = size * 1.15;
    lines.forEach((text, i) => {
      ctx.fillText(text, canvas.width / 2, centre + (i - (lines.length - 1) / 2) * lineHeight, photoW);
    });
  }
  return canvas;
}

function haloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export function createMemories() {
  const object = new THREE.Group();
  object.visible = false;

  const stringMaterial = new THREE.MeshBasicMaterial({ color: '#d8c79c', transparent: true, toneMapped: false });
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 60, 6), stringMaterial);
  string.rotation.z = Math.PI / 2;
  string.position.set(0, PIN_Y + 0.015, LANE_Z - 0.02);
  object.add(string);

  let frames = [];
  let slots = 0;

  function buildFrames(textures) {
    const cardGeometry = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const haloGeometry = new THREE.PlaneGeometry(CARD_W * 2, CARD_H * 1.7);
    const pinGeometry = new THREE.BoxGeometry(0.078, 0.2, 0.06);
    const pinMaterial = new THREE.MeshBasicMaterial({ color: '#a98255', transparent: true, toneMapped: false });
    const halo = haloTexture();

    slots = slotCount(textures.length);
    frames = Array.from({ length: slots }, (_, i) => {
      const group = new THREE.Group();
      const swing = new THREE.Group();
      group.add(swing);

      const centreY = -CARD_H / 2 - 0.096;
      const front = new THREE.Mesh(
        cardGeometry,
        new THREE.MeshBasicMaterial({ map: textures[slotPhoto(i, textures.length)], transparent: true, toneMapped: false }),
      );
      front.position.y = centreY;
      // Mặt sau để trơn: xoay camera ra sau xe thì không bị lật ngược chữ.
      const back = new THREE.Mesh(
        cardGeometry,
        new THREE.MeshBasicMaterial({ color: '#d6cfbd', transparent: true, toneMapped: false }),
      );
      back.position.set(0, centreY, -0.003);
      back.rotation.y = Math.PI;

      const glowMat = glowMaterial('#ffd7a0', 0);
      glowMat.map = halo;
      const glow = new THREE.Mesh(haloGeometry, glowMat);
      glow.position.set(0, centreY, -0.02);

      const pin = new THREE.Mesh(pinGeometry, pinMaterial);
      pin.position.set(0, -0.036, 0.018);
      swing.add(glow, back, front, pin);
      object.add(group);
      return { group, swing, front, back, glow };
    });
  }

  return {
    object,

    get count() {
      return frames.length === 0 ? 0 : new Set(frames.map((f) => f.front.material.map)).size;
    },

    // Trả về số ảnh tải được; ảnh lỗi bị bỏ qua và báo ở console để bạn biết sửa tên file.
    async load(photos) {
      if (!photos.length) return 0;
      try {
        await document.fonts?.load(`42px ${FONT}`);
      } catch {
        // Không có font thì vẽ bằng font dự phòng.
      }
      const loaded = await Promise.allSettled(photos.map((photo) => loadImage(photo.src)));
      const textures = [];
      loaded.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.warn(result.reason.message);
          return;
        }
        const texture = new THREE.CanvasTexture(drawCard(result.value, photos[i].caption));
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        textures.push(texture);
      });
      if (textures.length) buildFrames(textures);
      return textures.length;
    },

    // Khung bao của phần dải nhìn thấy được, để máy quay lùi ra cho vừa cả xe lẫn ảnh.
    bounds(lift) {
      return new THREE.Box3(
        new THREE.Vector3(-VISIBLE_HALF_WIDTH, PIN_Y - CARD_H - 0.1 + lift, LANE_Z - 0.1),
        new THREE.Vector3(VISIBLE_HALF_WIDTH, PIN_Y + 0.1 + lift, LANE_Z + FOCUS_LIFT),
      );
    },

    // offset: quãng dải đã trôi; strength: 0 là ẩn, 1 là hiện rõ; lift: độ nâng theo xe khi đã tháo rời.
    update(time, offset, strength, lift) {
      object.visible = strength > 0 && frames.length > 0;
      if (!object.visible) return;
      object.position.y = lift;
      stringMaterial.opacity = strength;
      frames.forEach(({ group, swing, front, back, glow }, i) => {
        const x = slotX(i, offset, slots);
        const focus = focusAt(x);
        group.position.set(x, PIN_Y, LANE_Z + focus * FOCUS_LIFT);
        group.scale.setScalar(MIN_SCALE + (MAX_SCALE - MIN_SCALE) * focus);
        swing.rotation.z = Math.sin(time * 0.9 + i * 1.7) * 0.035 + TILTS[i % TILTS.length] * (1 - focus);
        const opacity = strength * (0.6 + 0.4 * focus);
        front.material.color.setScalar(0.5 + 0.5 * focus);
        front.material.opacity = opacity;
        back.material.opacity = opacity;
        glow.material.opacity = 0.5 * focus * strength;
      });
    },
  };
}
