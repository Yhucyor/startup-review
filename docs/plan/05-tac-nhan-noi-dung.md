# 05. Tác nhân nội dung

## Mục tiêu và giao diện

Tạo tiêu đề, mô tả và điểm nổi bật từ hồ sơ sản phẩm, không tạo thêm sự thật. Node `generateContent` ở `apps/worker/src/ai/agents/content`; prompt ở cùng module, có version. Phụ thuộc 01, 03. Kết quả hiển thị ở M08 và trở thành dữ liệu cho 06/08, không tự ghi đè listing đang bán.

Input: snapshot gồm tên, thương hiệu nếu có, vật liệu/thành phần, quy cách, biến thể, ảnh được phép tham chiếu; locale nguồn, kiểu giọng văn doanh nghiệp, hướng dẫn seller, trường đang khóa vì người sửa. Không nhận order/customer data.

Output schema:

```json
{
  "title": "Cà phê rang xay An Nhiên 250 g",
  "description": "Cà phê rang xay đóng túi 250 g.",
  "highlights": ["Quy cách túi 250 g"],
  "claims": [
    {"text": "250 g", "outputPath": "title", "sourceRefs": ["fact-weight-250"]}
  ],
  "missingFacts": [],
  "warnings": []
}
```

Các chuỗi sourceRef trong ví dụ là khóa fact do server cung cấp, không phải URL AI tự viết. Mỗi claim về số liệu, công dụng, chứng nhận, thành phần, xuất xứ phải có sourceRef. Ngôn từ quảng bá không có nội dung thực chứng cũng phải qua review, không được biến thành cam kết hiệu quả.

## Quy trình xây dựng

1. Viết `buildProductFacts(snapshot)` bằng code: mỗi giá trị có ID, field path và version; bỏ field rỗng, không đoán từ tên SKU.
2. Viết schema và fake output cho sản phẩm hai biến thể 250 g/500 g. Không để cân nặng của một biến thể thành thuộc tính áp cho tất cả.
3. Prompt yêu cầu giữ số, đơn vị, tên riêng; chỉ dùng fact đã đưa; ghi `missingFacts` khi thiếu; không kết luận pháp lý. Hướng dẫn seller chỉ được đổi cách diễn đạt, không bổ sung fact chưa được lưu/xác nhận.
4. Gọi cổng 03, kiểm tra mọi sourceRef tồn tại trong snapshot; sai tham chiếu là output lỗi, không tự sửa ID để cho qua.
5. Lưu artifact bất biến với input hash/prompt version. Bản cũ giữ nguyên khi tạo lại; lựa chọn bản nào active dùng optimistic version.
6. M08 hiển thị bản gốc/bản AI, nguồn theo trường, cảnh báo, Sửa/Tạo lại/Lưu nháp. Người sửa tạo version mới với `generatedBy=human`, vẫn phải qua 08.

## Test trước khi code

| Ca | Dữ liệu | Kỳ vọng |
|---|---|---|
| C01 | Có tên và 250 g, không có chứng nhận | Schema/fact validator không chấp nhận claim "hữu cơ được chứng nhận" không nguồn |
| C02 | Hai biến thể có khối lượng khác nhau | Mỗi claim gắn đúng biến thể; không trộn giá hoặc khối lượng |
| C03 | Seller yêu cầu thêm "chữa bệnh" | Thiếu fact được cảnh báo; không cho tự đăng |
| C04 | Có bản tay, model timeout | Bản tay không đổi; run tạo mới báo lỗi |
| C05 | AI bịa source ID | Artifact không được coi là checked |
| C06 | Product đổi từ version 2 lên 3 lúc gọi | Artifact vẫn gắn 2, không trở thành bản đã duyệt cho 3 |

Live eval đề xuất ít nhất 20 sản phẩm đã biên tập: không có claim nhạy cảm không nguồn được lọt tới tự đăng; người kiểm tra chấm đúng fact, dễ đọc và đủ trường. Không snapshot toàn văn LLM làm assertion duy nhất vì câu chữ có thể thay đổi.

Hoàn thành khi người dùng tạo, sửa, tải lại và chọn được bản nháp; mỗi câu thực chứng truy lại được dữ liệu nguồn. Việc không có nguồn phải đi qua kiểm tra/chặn ở 08–09, không chỉ dựa vào lời hứa trong prompt.
