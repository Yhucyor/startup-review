# 08. Kiểm tra nội dung và quy tắc sàn

## Hai phần cùng phục vụ một kết quả

`reviewContent` dùng LLM để phát hiện sai ý nghĩa, thêm công dụng, mâu thuẫn hoặc bản dịch sai. `validateListing` là hàm code kiểm tra schema, ảnh, danh mục, thuộc tính, số, nguồn và quy tắc sàn đã xác minh. Code tại `apps/worker/src/ai/agents/review` và module server `listings/validation`. Phụ thuộc 01, 03, 05–07; nối legal check 15 khi đã bật phạm vi thị trường.

Input luôn là bản cuối sau merge/chỉnh tay, snapshot fact, taxonomy/ruleset có version và mode. Output chung:

```json
{
  "status": "needs_input",
  "findings": [
    {
      "code": "UNSUPPORTED_CLAIM",
      "path": "description",
      "severity": "block",
      "messageVi": "Thông tin chứng nhận chưa có trong hồ sơ sản phẩm.",
      "sourceRefs": [],
      "suggestedFix": "Bỏ câu này hoặc bổ sung chứng nhận để kiểm tra lại."
    }
  ],
  "rulesetVersion": "demo-1",
  "reviewedPayloadHash": "hash-of-final-payload"
}
```

`status` thuộc `pass|needs_input|blocked|unverified`; severity thuộc `info|warning|block`. `unverified` dùng khi thiếu ruleset/dataset cần kiểm tra. Không biến lỗi gọi review thành `pass`.

## Xây bộ quy tắc

1. Tạo `marketplace_rulesets` với platform, thị trường, version, nguồn, ngày xác minh, người xác minh, thời hạn rà soát, trạng thái demo/live. Không điền số giới hạn Shopee từ trí nhớ hoặc từ câu trả lời LLM.
2. Viết validator nhận ruleset làm input: trường bắt buộc, độ dài theo đơn vị sàn quy định, danh mục hợp lệ, thuộc tính, ảnh đủ số/định dạng/kích thước, biến thể và giá/tồn.
3. Ảnh phải được kiểm tra metadata/nội dung tải lên bằng code có giới hạn kích thước; không tin phần mở rộng. URL ngoài đi qua bộ tải có allowlist/kiểm soát SSRF, timeout và hạn mức; không cho model tùy ý fetch URL.
4. Danh mục/thuộc tính AI đoán chỉ là suggestion với taxonomy ID/version và bằng chứng. Người bán xác nhận trước khi thành fact; không suy ra thành phần/chứng nhận từ ảnh mờ.
5. Xác minh claim refs thật và đúng version. Fact cấu trúc phải so sánh đúng giá trị. Với diễn đạt tự do không thể chứng minh tự động, đánh dấu cần người duyệt. Tự đăng chỉ dùng claim/template/thuật ngữ đã được doanh nghiệp chấp thuận và khớp fact; LLM review pass không tự đủ điều kiện.
6. Gọi Review agent để bổ sung findings. Merge theo nguyên tắc mức nặng hơn thắng; AI không được xóa lỗi code/ruleset.
7. Lưu report theo payload hash + snapshot/ruleset/reviewer prompt version; sửa một trường khiến report cũ stale. Người dùng sửa hoặc chọn danh mục xong phải kiểm tra lại.

## Test trước khi nối policy

| Ca | Kỳ vọng |
|---|---|
| R01: Thiếu thuộc tính bắt buộc | Finding đúng field và tên cần bổ sung |
| R02: Tiêu đề đúng/bằng/vượt giới hạn fixture | Hai ca đầu qua, ca cuối lỗi theo đúng phép đếm quy định |
| R03: Review nói pass nhưng code thấy giá âm | blocked, không cho AI override |
| R04: SourceRef tồn tại nhưng fact khác 250/500 g | Sai giá trị bị chặn |
| R05: Không có ruleset live đã xác minh | unverified, không tự đăng và không giả báo đã kiểm tra Shopee |
| R06: Người sửa description sau report | Hash lệch; phải kiểm tra lại |
| R07: URL ảnh trỏ mạng nội bộ/redirect vào nội bộ | Bị chặn trước tải; không ghi nội dung mạng nội bộ |
| R08: Hai SKU trùng thuộc tính biến thể | Báo lỗi đúng biến thể theo ruleset |

Hoàn thành khi UI M08/M10 hiển thị lỗi theo trường, nguồn và bước sửa; nút kiểm tra chạy cùng validator mà execution sử dụng. Không nhân đôi validation riêng cho chat hoặc luồng tự đăng.
