// ĐÂY LÀ FILE DUY NHẤT BẠN CẦN SỬA.
// Thay mỗi dòng bắt đầu bằng [ĐIỀN bằng lời của bạn, giữ nguyên dấu nháy ` ở hai đầu.
// Muốn xuống dòng trong lời nhắn thì cứ nhấn Enter.
// Dòng `action` là chú thích ngắn cho chuyển động của bộ phận, đã viết sẵn và có thể sửa.

export const content = {
  // Hiện cùng chiếc xe nguyên vẹn, ngay khi mở trang.
  opening: `Điều bất ngờ cho bebe iu`,

  // Hiện khi người xem đã đọc hết 12 bộ phận và xe lắp lại.
  finale: `HAPPY BIRTHDAY bé iu!`,

  // Ảnh kỷ niệm chạy dọc đường khi bật ô "Ảnh kỷ niệm" ở thanh chế độ.
  // Cách dùng: bỏ ảnh vào thư mục public/photos, rồi ghi tên file và chú thích ở đây (chú thích có thể bỏ trống).
  // Ảnh ngang hay dọc đều được; nên dùng ảnh khoảng 1600 px trở xuống cho nhẹ.
  // Để trống danh sách ([]) thì ô "Ảnh kỷ niệm" tự ẩn.
  // Sáu ảnh mẫu bên dưới (sample-*) phải được thay hoặc xoá, nếu không `npm run build` sẽ dừng.
  photos: [
    { src: "image_1.jpg", caption: `` },
    { src: "image_2.jpg", caption: `` },
    { src: "image_3.jpg", caption: `` },
    { src: "image_4.jpg", caption: `` },
    { src: "image_5.jpg", caption: `` },
    { src: "image_6.jpg", caption: `` },
    { src: "image_7.jpg", caption: `` },
    { src: "image_8.jpg", caption: `` },
    { src: "image_9.jpg", caption: `` },
    { src: "image_10.jpg", caption: `` },
  ],

  parts: {
    tank: {
      name: "Bình xăng",
      action: "Xăng sóng sánh trong bình theo nhịp xe chạy.",
      quote: `Gọi em là bình xăng, vì nụ cười em là nhiên liệu để anh tiến bước`,
    },
    engine: {
      name: "Động cơ",
      action:
        "Hai piston chạy ngược chiều nhau, nổ hai lần liền nhau rồi nghỉ: nhịp riêng của máy 2 xi-lanh này.",
      quote: `Gọi em là động cơ, vì nhịp điệu của em thúc giục anh hoạt động mỗi ngày`,
    },
    seat: {
      name: "Yên xe",
      action: "",
      quote: `Gọi em là yên xe, vì góc bình yên nhất của anh là được cùng em đi khắp thế gian`,
    },
    handlebar: {
      name: "Ghi đông",
      action: "Đánh lái trái phải quanh trục cổ khung.",
      quote: `Gọi em là ghi đông, vì chỉ cần em nắm tay anh là mọi hướng đi đều đúng`,
    },
    headlight: {
      name: "Đèn pha",
      action: "Đèn bật lên, chiếu sáng đoạn đường phía trước.",
      quote: `Gọi em là đèn pha, em làm mọi lối đi của anh đều rực sáng`,
    },
    fork: {
      name: "Phuộc trước",
      action: "Chân phuộc trượt theo ống trong để hấp thụ ổ gà.",
      quote: `Gọi đôi má em là phuộc ohlins, vì độ đàn hồi luôn là nhất`,
    },
    frontWheel: {
      name: "Bánh trước",
      action: "Bánh lăn về phía trước, đĩa phanh quay theo.",
      quote: `Gọi em là bánh trước, vì chỉ cần có em là mọi chướng ngại đều được vượt qua`,
    },
    rearWheel: {
      name: "Bánh sau",
      action: "Bánh được xích kéo qua nhông, đẩy cả xe đi tới.",
      quote: `Gọi em là bánh xe, vì cuộc đời anh chỉ chuyển động khi có em đồng hành
`,
    },
    frame: {
      name: "Khung xe",
      action: "Khung đứng vững, càng sau lắc quanh trục để bánh sau lên xuống.",
      quote: `Gọi em là khung sườn, vì hình bóng em là điểm tựa vững chắc cho anh ôm lấy`,
    },
    exhaust: {
      name: "Ống xả",
      action:
        "Khí nóng từ hai xi-lanh theo hai cổ xả dồn về ống tiêu âm rồi thoát ra.",
      quote: `Gọi em là ống xả, vì em thật nóng bỏng, anh không khéo dễ phỏng như chơi`,
    },
    shock: {
      name: "Giảm xóc sau",
      action: "Lò xo nén lại khi xe xóc rồi giãn ra.",
      quote: `Gọi em là giảm xóc, vì có em bên cạnh, mọi giông bão cuộc đời đều hóa dịu êm`,
    },
    fender: {
      name: "Chắn bùn",
      action:
        "Chặn nước văng lên từ lốp; đèn hậu và xi-nhan phía sau cũng sáng theo.",
      quote: `gọi em là chắn bùn, vì có em trong đầu, mọi chuyện 'bụi bẩn' chẳng làm khó được anh`,
    },
  },
};
