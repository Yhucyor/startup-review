# 13. Tác nhân xử lý ngoại lệ

## Mục tiêu

Phân loại lỗi, đưa hướng xử lý có bằng chứng và tạo bản sửa mới khi cần. Không cho LLM quyết định retry một giao dịch không rõ đã thành công. Phụ thuộc 03, 10–12. Code `ai/agents/exception` và hàm thuần `classifyFailure` trong server.

## Đầu vào và đầu ra

Input đã lọc: error code chuẩn hóa, operation, external response đã bỏ bí mật/PII, action/run ID, payload version, lịch sử attempts, rule/capability version, product facts cần thiết. Output: `summaryVi`, `evidenceRefs`, `proposedNextStep`, `fieldPatches`, `missingInformation`, `warnings`. Patch có field allowlist và before/after; không có raw HTTP request, SQL hoặc lệnh shell.

| Lớp lỗi do code xác định | Xử lý |
|---|---|
| Mạng trước khi gửi, rate limit, tạm ngừng | Retry bounded nếu operation chứng minh an toàn |
| Credential/scope | Tạo việc kết nối lại, dừng retry vô ích |
| Thiếu thuộc tính/danh mục/ảnh | Đề nghị sửa draft mới và duyệt lại |
| Unsupported claim/pháp lý | Bổ sung nguồn hoặc sửa nội dung; không lách gate |
| External unknown | Đối soát theo 11, không tạo bản đăng mới |
| SKU không map/tồn thiếu | Việc đơn/tồn theo 12; AI không chọn quantity |
| Lỗi không nhận diện | Cần kiểm tra, giữ mã lỗi và correlation ID |

## Các bước code

1. Viết bảng mapping error code chính thức → class, versioned theo adapter. Lỗi không có trong bảng đi vào unknown; model không được đổi unknown thành an toàn retry.
2. Sinh summary bằng template cho lỗi rõ như token hết hạn. Chỉ gọi LLM khi cần diễn giải lỗi nhiều trường hoặc đề xuất sửa nội dung, giảm chi phí.
3. Chỉ đưa phần lịch sử cùng tenant và mục tiêu; giới hạn số attempt/tổng độ dài. Response sàn có câu lệnh được coi là text dữ liệu.
4. Validate patch allowlist, sourceRefs và expected version. Patch mới tạo proposal mới; không sửa trực tiếp listing live.
5. Dedup task theo target + error class + affected version; gom số lần lặp. Lỗi mới/phiên bản mới cập nhật liên kết nhưng không spam thẻ mỗi lần retry.
6. Áp retry budget chung giữa queue và model runtime, không nhân 5 queue retries × 3 graph retries × 2 SDK retries. Sau ngân sách, lưu failed/task và chờ người xử lý.

## Test

| Ca | Kỳ vọng |
|---|---|
| EX01: Token hết hạn 5 lần | Một task kết nối, không 5 lời gọi AI |
| EX02: Model khuyên "retry ngay" với unknown create | Vẫn đối soát, không gọi create |
| EX03: Thiếu attribute cụ thể | Summary nêu đúng trường, patch chưa tự thực thi |
| EX04: Patch vào `price` hoặc `permissions` | Bị từ chối trong node sửa nội dung |
| EX05: Seller từ chối patch, lỗi lặp nguyên trạng | Không dựng lại cùng đề xuất để ép duyệt |
| EX06: Model unavailable | Template lỗi + mã tham chiếu + thao tác tay vẫn hoạt động |

Hoàn thành khi M15 chỉ ra nguyên nhân, bằng chứng, ai có thể xử lý và bước kế tiếp; mỗi bản sửa có lịch sử và đi lại qua 08–11.
