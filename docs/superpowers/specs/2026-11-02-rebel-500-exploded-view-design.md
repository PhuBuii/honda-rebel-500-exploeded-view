# Exploded view Honda Rebel 500: thiết kế

Ngày: 2026-11-02

## 1. Mục tiêu

Một trang web làm quà cá nhân. Người nhận mở link, xem chiếc Honda Rebel 500 3D bung thành từng bộ phận, bấm vào mỗi bộ phận để zoom đến và đọc một lời nhắn riêng do tác giả viết.

**Tiêu chí thành công**

- Người nhận mở được link trên điện thoại hoặc máy tính mà không cần cài đặt hay đăng nhập.
- Nhìn vào là nhận ra dáng bobber của Rebel 500, dù hình ảnh được cách điệu.
- Bấm được cả 12 bộ phận, kể cả chi tiết nhỏ trên màn hình điện thoại.
- Tác giả đổi toàn bộ lời nhắn chỉ bằng cách sửa một file, không đụng đến logic.

## 2. Phạm vi

**Có làm**

- Mô hình 3D dựng bằng code với Three.js, gồm 12 bộ phận tách rời.
- Hành trình 5 bước ở mục 3.
- Giao diện tiếng Việt, chạy được trên cả điện thoại và máy tính.
- Bản build tĩnh, đưa được lên hosting miễn phí (Netlify, Vercel).

**Không làm**

- Hình ảnh giống ảnh chụp, hoặc dùng mô hình 3D mua ngoài.
- Âm thanh, máy chủ, đăng nhập, trang quản trị nội dung.
- Lưu tiến độ giữa các lần mở trang: tải lại trang thì xem lại từ đầu.
- Đa ngôn ngữ.
- Tự triển khai lên hosting: chỉ làm khi tác giả yêu cầu.

## 3. Trải nghiệm người xem

1. **Mở đầu:** chiếc xe nguyên vẹn tự xoay chậm trong studio tối, đèn ấm, kèm câu mở đầu và một nút duy nhất "Tiến tới thôi nào bae!!".
2. **Vào cảnh:** bấm nút thì xe vào thẳng cảnh nguyên xe, **mặc định đang chạy và ảnh kỷ niệm đã bật** (nếu có ảnh; không có ảnh thì chỉ chạy). Người xem vẫn đổi được sang "Tháo rời" ở thanh chế độ: các bộ phận từ từ bung ra và lơ lửng quanh khung xe, kéo để xoay và chụm hoặc cuộn để phóng to trong giới hạn cho phép.
3. **Xem bộ phận:** bấm một bộ phận thì máy quay bay đến gần và khóa điều khiển xoay, các bộ phận khác mờ đi, tên bộ phận và lời nhắn hiện dần từng chữ. Bấm vào khung lời nhắn trong lúc chữ đang chạy sẽ hiện ngay toàn bộ.
4. **Quay lại:** bấm nút đóng, bấm ra vùng trống hoặc nhấn Esc để về toàn cảnh. Bộ phận đã xem được đánh dấu nhẹ, tiến độ hiện dạng "3/12".
5. **Kết thúc:** khi đóng bộ phận chưa xem cuối cùng, xe tự lắp lại và lời nhắn cuối hiện ra, kèm nút "Xem lại" để về bước 2 với tiến độ giữ nguyên.

**Hai công tắc khi đang xem:** "Nguyên xe / Tháo rời" chọn cách xem, ở chế độ nguyên xe có thể rê chuột hoặc bấm trực tiếp lên bộ phận. "Đứng yên / Đang chạy" cho xe chạy trên đường: bánh quay khớp tốc độ mặt đường, hệ thống treo và thân xe phản ứng theo cùng một mặt đường. Mở một bộ phận thì xe dừng, chuyển động riêng của bộ phận đó thay vào; đóng lại thì xe chạy tiếp.

**Ảnh kỷ niệm:** ô tick thứ ba trên thanh chế độ. Bật lên thì xe tự chạy và một dải ảnh polaroid treo trên dây phía sau đường trôi chậm qua màn hình, ảnh ở giữa to và sáng hơn, mỗi ảnh nằm giữa khoảng 3,6 giây; máy quay lùi ra cho vừa cả xe lẫn ảnh. Ảnh và chú thích khai báo ở `photos` trong `src/content.js`, file ảnh để trong `public/photos/`; danh sách trống hoặc không ảnh nào tải được thì ô tick tự ẩn, ảnh lỗi đường dẫn bị bỏ qua và báo ở console. Bật ảnh thì xe chạy theo, tắt chạy thì ảnh tắt theo. Mở một bộ phận thì ảnh mờ đi cùng mặt đường rồi trở lại khi đóng.

**Âm thanh:** ô tick thứ tư "Tiếng xe", bật sẵn, chỉ tắt hoặc bật tiếng máy; nhạc nền không bị ảnh hưởng. Tiếng máy và nhạc nền đều tổng hợp bằng Web Audio, không dùng file thu âm, và chỉ khởi tạo sau lần bấm đầu tiên của người xem (trình duyệt không cho tự phát). Tiếng máy theo nhịp thật của máy 2 xi-lanh trục khuỷu 180° (nổ hai nhịp cách 180° rồi nghỉ 540°): bấm nút vào cảnh thì củ đề quay khoảng một giây rồi nổ máy; đứng yên thì cầm chừng khoảng 1300 rpm, đang chạy thì khoảng 3300 rpm; tháo rời thì máy im; mở một bộ phận thì tiếng xe nhỏ lại. Khi dải ảnh kỷ niệm hiện ra thì phát nhạc lãng mạn (tám hợp âm kiểu "Canon", rải nốt như hộp nhạc) và tiếng xe hạ xuống còn một phần tư; ảnh tắt thì nhạc tắt dần. Có thể thay nhạc bằng file riêng qua `music` trong `src/content.js`. Trang bị ẩn thì âm thanh tạm dừng.

**12 bộ phận:** bình xăng, động cơ, yên xe, ghi đông, đèn pha, phuộc trước, bánh trước, bánh sau, khung xe, ống xả, giảm xóc sau, chắn bùn.

**Hình ảnh:** toàn thân đen, vành màu đồng, nền tối. Hình dáng và toạ độ đo từ ảnh báo chí Honda bản 2024 nhìn ngang bên phải (chiều dài cơ sở 1,49 m): khung thanh chéo có tấm ốp tam giác, bình xăng hạt lạc, yên đen thấp, phuộc ngả, đèn pha tròn, lốp to bản có gai, động cơ 2 xi-lanh đen lộ khung, ống xả dài vượt trục bánh sau.

## 4. Kiến trúc

Vite và Three.js, JavaScript thuần, không dùng framework giao diện.

| File | Nhiệm vụ | Phụ thuộc |
|---|---|---|
| `src/content.js` | Câu mở đầu, tên và lời nhắn của 12 bộ phận, lời nhắn cuối | Không |
| `src/config.js` | Màu xe, tốc độ chuyển động | Không |
| `src/parts/` | Các file dựng từng bộ phận; `index.js` gom lại thành `{ id, object, assembledPosition, explodeOffset, portraitOffset, focusDirection }` | Three.js, `config.js` |
| `src/scene.js` | Renderer, ánh sáng, máy quay, điều khiển xoay | Three.js |
| `src/state.js` | Máy trạng thái `intro → exploded → focused → finale` và tập bộ phận đã xem; không chạm vào Three.js hay DOM | Không |
| `src/motion.js` | Hoạt ảnh bung và lắp, máy quay bay đến bộ phận, làm mờ bộ phận khác | Three.js, `config.js` |
| `src/picking.js` | Biến cú bấm thành `id` bộ phận; mỗi bộ phận có một khối vô hình lớn hơn để dễ chạm | Three.js |
| `src/ui.js` | Lớp DOM phía trên canvas: nút, khung lời nhắn, hiệu ứng chữ, tiến độ, danh sách bộ phận | `content.js` |
| `src/main.js` | Nối các phần: sự kiện từ `ui` và `picking` đi vào `state`, thay đổi của `state` điều khiển `motion` và `ui` | Tất cả |

**Luồng dữ liệu:** thao tác của người xem → `state` chuyển trạng thái → `main` gọi `motion` và `ui`. Chỉ `state` quyết định trạng thái hiện tại; trong lúc đang chuyển cảnh, `main` bỏ qua các cú bấm chọn bộ phận.

**Hiệu năng:** tổng tối đa 150.000 tam giác, giới hạn tỉ lệ điểm ảnh ở mức 2.

## 5. Nội dung

`src/content.js` là một object có khóa theo `id` bộ phận. Mọi lời nhắn ban đầu là chữ giữ chỗ bắt đầu bằng `[ĐIỀN`.

Hàm `validateContent` báo lỗi nếu thiếu `id`, chuỗi rỗng, hoặc còn chữ giữ chỗ:

- `npm run dev`: vẫn chạy và in cảnh báo ở console, để xem được trang khi chưa viết xong.
- `npm run build`: dừng và liệt kê các bộ phận chưa điền, để không thể đưa bản còn chữ giữ chỗ lên mạng.
- `npm run build:draft`: bỏ qua kiểm tra này, chỉ dùng để xem thử trên điện thoại.
- Với `photos`: build cũng dừng nếu còn chú thích `[ĐIỀN ...]`, thiếu đường dẫn, hoặc còn dùng ảnh mẫu (`sample-*`). Chú thích có thể bỏ trống.

## 6. Xử lý tình huống đặc biệt

- **Không có WebGL:** hiện danh sách tên bộ phận và lời nhắn dạng chữ, kèm lời nhắn cuối.
- **Mất ngữ cảnh WebGL khi đang xem:** chuyển sang cùng danh sách dạng chữ đó.
- **`prefers-reduced-motion`:** bỏ tự xoay và hiệu ứng chữ, rút hoạt ảnh còn tối đa 200 ms.
- **Bàn phím và trình đọc màn hình:** danh sách bộ phận là các nút thật trong DOM, chọn được bằng phím; Esc để đóng.
- **Đổi kích thước hoặc xoay điện thoại:** cập nhật lại máy quay, giữ nguyên trạng thái.

## 7. Kiểm thử

**Tự động (Vitest)**

- `state.js`: mọi chuyển trạng thái, đếm bộ phận đã xem, chỉ vào `finale` khi đóng bộ phận chưa xem cuối cùng, xem lại một bộ phận cũ không làm tăng tiến độ.
- `validateContent`: đủ nội dung, thiếu `id`, chuỗi rỗng, còn chữ giữ chỗ.
- `src/parts/index.js`: đúng 12 `id`, khớp với các khóa trong `content.js`.

**Thủ công trên trình duyệt (khổ máy tính và 375×812)**

- Đi trọn hành trình 5 bước, bấm được cả 12 bộ phận.
- Chữ không tràn hoặc che bộ phận đang xem.
- Không có lỗi ở console.

**Giới hạn:** khổ điện thoại trong trình duyệt chỉ là mô phỏng, không đo được hiệu năng trên máy thật. Tác giả cần mở thử trên điện thoại thật trước khi gửi.
