# 01. Nền tảng dữ liệu và hợp đồng

## Mục tiêu và phạm vi

Tạo nền móng để tất cả agent chỉ đọc đúng doanh nghiệp, dùng cùng dữ liệu và không thực thi một bản đề xuất cũ. Phụ thuộc: đăng nhập, doanh nghiệp, thành viên, catalog và cửa hàng phải có API thật hoặc fixture integration. Đây là công việc code xác định, không gọi LLM.

## Cấu trúc code đề xuất

- Giữ frontend hiện tại trong `src/app`; thêm NestJS tại `apps/api`, worker tại `apps/worker`, schema dùng chung tại `packages/contracts` khi triển khai.
- Chỉ chia module theo trách nhiệm cần dùng: `organizations`, `catalog`, `ai`, `automation`, `listings`, `orders`, `inventory`, `marketplaces`. Không thêm repository/interface cho từng bảng.
- API và worker dùng chung logic nghiệp vụ server; frontend chỉ nhập schema/DTO không chứa bí mật. Build API/worker với tsconfig riêng; điều chỉnh phạm vi tsconfig frontend để không type-check cả runtime server bằng cấu hình Next.js.
- Dùng schema runtime đã được nhóm chấp thuận, suy ra kiểu TypeScript từ schema; không viết lại ba bản validation khác nhau.

## Hợp đồng chung

| Trường | Quy tắc |
|---|---|
| `organizationId` | Bắt buộc cho mọi dữ liệu nghiệp vụ, xác minh membership từ phiên hoặc service principal |
| `mode` | `demo` hoặc `live`; bất biến trong một run và action |
| `id`, `correlationId` | ID opaque do server sinh; correlation liên kết toàn hành trình |
| `version` | Số nguyên tăng sau mỗi thay đổi ảnh hưởng đề xuất; không dùng timestamp làm version |
| `createdAt`, `updatedAt` | Thời điểm UTC; UI chuyển theo múi giờ người dùng |
| `money` | Số nguyên đơn vị nhỏ nhất dưới dạng chuỗi + mã tiền tệ; parse thành số nguyên an toàn phía server, không dùng float |
| `quantity` | Số nguyên không âm trong miền giới hạn do schema định nghĩa |
| `sourceRef` | `{kind, recordId, version, fieldPath}`; server xác minh tham chiếu thuộc tenant và snapshot |

`Actor` là một trong `user` với ID người dùng hoặc `automation` với ID quy tắc. Không nhận vai trò hay quyền do client/LLM tự khai. User action cần membership còn hiệu lực; automation cần quy tắc và phạm vi ủy quyền còn hiệu lực, không mượn session cũ của người tạo.

`Error` công khai gồm `code`, `messageVi`, `fieldErrors`, `retryable`, `correlationId`; không trả stack trace hoặc response chứa token. Mã lỗi chuẩn: `INVALID_INPUT`, `FORBIDDEN`, `NOT_FOUND`, `STALE_VERSION`, `DUPLICATE_CONFLICT`, `NEEDS_INPUT`, `RATE_LIMITED`, `EXTERNAL_UNKNOWN`.

## Dữ liệu cần lưu

| Bảng | Cột và ràng buộc tối thiểu |
|---|---|
| `products`, `variants`, `stores`, `listings` | Thuộc tenant; SKU unique theo tenant; tham chiếu chéo có khóa ngoại ghép tenant; giá/tồn có CHECK không âm |
| `product_snapshots` | Product + version + toàn bộ fact/ảnh/biến thể cần AI, bất biến |
| `ai_runs` | Tenant, trigger ID, workflow/version, input versions, status, mode, correlation ID |
| `ai_steps` | Run, node, input hash, attempt, status, output schema version, artifact ID, lỗi, usage |
| `proposals` | Loại thao tác, mục tiêu, payload bất biến, expected versions, hash, nguồn, cảnh báo, status |
| `approvals`, `policy_decisions` | Proposal/hash, actor hoặc rule/version, quyền thao tác, kết quả, thời điểm |
| `actions`, `action_attempts` | Proposal, idempotency key, trạng thái dispatch/kết quả, external ID, lần thử |
| `tasks`, `activity_events` | Việc cần người xử lý, trạng thái, lý do, tài nguyên và phiên bản liên quan |

Các bảng chuyên biệt được bổ sung tại khối sở hữu, không tạo hết ở migration đầu. Unique key không được chỉ dựa vào bộ nhớ/Redis. Thêm index `(organization_id, status, created_at, id)` cho inbox/run và index theo khóa đối tượng dùng để truy xuất.

## Hợp đồng API

Tiền tố minh họa `/v1/organizations/{organizationId}`. Server xác minh tenant trên cả đường dẫn và đối tượng bên trong body. `GET /ai/runs/{id}` trả status, step summary, task/proposal ID; `POST /products/{id}/prepare` nhận store, locale, expected product version và `Idempotency-Key`, trả `202` cùng `runId`/`statusUrl`. Cùng key và cùng payload trả kết quả đã có; cùng key nhưng payload khác trả `409`.

Mutation có cookie session phải được chống CSRF theo cơ chế xác thực đã chọn. Không dùng ID khó đoán làm phân quyền. Đối tượng ngoài tenant trả `404` để tránh lộ sự tồn tại; thao tác không có quyền trên tài nguyên cùng tenant trả `403`.

## Trình tự triển khai

1. Viết fixture A/B, mỗi bên có cùng SKU `CAFE-250`; tạo OWNER, PRODUCT_MANAGER, ORDER_MANAGER, STAFF, VIEWER và ADMIN có phạm vi giới hạn.
2. Viết kiểm thử tenant/quyền thất bại; tạo migration và hàm đọc tài nguyên bắt buộc tenant.
3. Thêm snapshot khi lưu sản phẩm, version tăng bằng cập nhật có điều kiện. Yêu cầu `expectedVersion` cho sửa để tránh mất thay đổi đồng thời.
4. Xây schema event/proposal/error và thử parse đầu vào sai. Không ép kiểu JSON từ network thành kiểu đã tin cậy.
5. Thêm API tạo/đọc run với trạng thái bền vững, chưa cần agent thật. Run dùng snapshot thay vì đọc sản phẩm đang thay đổi qua từng node.
6. Bảo đảm API/worker/web đều build được bằng cấu hình riêng trước khi nối khối 02.

## Test phải viết

| Ca | Đầu vào | Kết quả kiểm chứng |
|---|---|---|
| F01 | A yêu cầu product thuộc B | 404; không có run/snapshot mới, response không có tên sản phẩm B |
| F02 | Hai tenant cùng SKU | Cả hai hợp lệ; cùng tenant thêm lại bị lỗi unique |
| F03 | Hai request sửa version 3 | Một lên 4; request còn lại 409, không ghi đè |
| F04 | Proposal version 3, product lên 4 | Phát hiện stale, không được thực thi |
| F05 | Body khai role OWNER nhưng session STAFF | Không đổi quyền; duyệt bị 403 |
| F06 | Mode demo tham chiếu live store | Validation từ chối trước queue |
| F07 | Giá âm, quantity lẻ, ID sai định dạng | 400 và field error; DB không đổi |

Hoàn thành khi migration chạy trên DB test rỗng, các ca trên qua và cùng DTO dùng được ở cả API lẫn worker. Chưa cần vector DB hoặc lớp service cho từng tác nhân.
