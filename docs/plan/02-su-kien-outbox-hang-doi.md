# 02. Sự kiện, outbox và hàng đợi

## Mục tiêu và hợp đồng

Lưu sản phẩm thành công phải tạo được công việc dù Redis hoặc worker đang ngừng. Phụ thuộc 01. Code ở `apps/api/src/events` và `apps/worker/src/jobs`; PostgreSQL là nguồn trạng thái, BullMQ chỉ phân phối việc.

Event bất biến gồm `id`, `organizationId`, `type`, `aggregateId`, `aggregateVersion`, `mode`, `origin`, `occurredAt`, `correlationId`, `causationId`, `payloadVersion`. Payload chỉ mang ID/version cần thiết; không chứa credential hoặc toàn bộ thông tin người mua.

| Sự kiện | Quy trình nhận |
|---|---|
| `product.saved`, `product.imported` | Chuẩn bị listing khi bật tự tạo nháp và có target store |
| `listing.rejected`, `sync.failed` | Phân loại lỗi, retry hoặc tạo ngoại lệ |
| `order.received`, `order.status_changed` | Xử lý đơn bằng code, chỉ gọi AI khi cần giải thích |
| `inventory.changed`, `price.changed` | Tạo đồng bộ các listing liên quan |
| `automation.changed`, `store.disconnected` | Đánh dấu việc cần kiểm tra lại; execution vẫn tự kiểm tra trước gửi |
| `proposal.approved` | Tạo action đúng proposal/hash đã duyệt |
| `assistant.action_requested` | Chuẩn bị đề xuất; không bỏ qua policy |

## Dữ liệu và thuật toán

`outbox_events`: envelope, `available_at`, `leased_until`, `lease_token`, `attempts`, `delivered_at`, `last_error`. `event_consumptions`: unique `(organization_id,event_id,consumer)` để một event có thể đến nhiều consumer mà mỗi consumer chỉ xử lý một lần có hiệu lực.

1. Trong transaction lưu product/version/snapshot, đồng thời insert event. Rollback phải rollback cả hai.
2. Dispatcher lấy một batch đến hạn bằng khóa có bỏ qua hàng đang bị khóa, ghi lease ngắn rồi commit. Không giữ transaction DB suốt lời gọi Redis.
3. Enqueue với job ID ổn định từ event ID và consumer; sau Redis xác nhận, đánh dấu delivered bằng lease token còn đúng.
4. Crash giữa enqueue và đánh dấu delivered có thể enqueue lại. Worker dùng unique consumption và unique run ở DB để chống tác dụng lặp; không chỉ trông vào job ID vì job đã xóa có thể được thêm lại.
5. Worker claim công việc bằng compare-and-set/lease có token; chạy rồi commit kết quả cùng consumption. Worker cũ mất lease không được ghi kết quả đè worker mới.
6. Reconciler quét công việc non-terminal quá hạn kể cả event đã delivered. Redis mất dữ liệu vẫn có thể tái phát job từ trạng thái DB, sau khi kiểm tra chưa có lease hoạt động.

Tách queue AI, thực thi sàn và nhận/đồng bộ đơn để LLM chậm không chặn đơn. Không tạo một queue cho mỗi sản phẩm. Cấu hình đầu tiên đề xuất: batch 50, lease 60 giây có gia hạn, retry hạ tầng tối đa 5 lần với backoff có jitter; đây là cấu hình dự án, đo tải để điều chỉnh.

## Các trường hợp phải xử lý

- CSV chỉ phát event cho dòng đã xác nhận và thực sự commit. Khóa nhập gồm import ID + row ID; bấm lại trả kết quả cũ.
- Chưa có cửa hàng: tạo một task `CONNECT_STORE` theo product/version; không gọi AI vô ích. Kết nối xong cần chọn phạm vi chuẩn bị, không tự đăng mọi sản phẩm cũ.
- Một product thay đổi liên tiếp: version cũ đang chờ có thể chuyển `superseded`; không gộp mất event đơn hàng. Không khởi động workflow lặp từ event do chính output của nó tạo ra.
- Đồng bộ phản hồi từ sàn mang origin/version; chỉ cập nhật xác nhận, không phát một thay đổi tồn nội bộ tương đương.
- Hết retry: status `failed`, task có lý do và nút thử lại cùng business key; không xóa để chạy lại với key mới tùy tiện.

## Trình tự code và test

Viết integration test outbox trước; thêm transaction; viết dispatcher; thêm consumer; cuối cùng thêm timer phục hồi. Dùng DB/Redis test thật, inject lỗi ở ranh giới commit/enqueue để thấy lỗi trước khi sửa.

| Ca | Cách kích thích | Kỳ vọng |
|---|---|---|
| E01 | Tắt Redis, lưu product | API thành công, outbox pending; bật Redis tạo đúng một run |
| E02 | Transaction product rollback | Không có product mới hoặc event mồ côi |
| E03 | Crash sau enqueue trước delivered | Replay vẫn một run và một task |
| E04 | Hai dispatcher đọc cùng lúc | Không mất event; trùng delivery không gây trùng tác dụng |
| E05 | Worker chết sau DB commit, trước queue ack | Job chạy lại trả kết quả đã có |
| E06 | Xóa queue trong môi trường test cô lập | Reconciler phục hồi việc còn thiếu từ DB |
| E07 | Gửi echo tồn version đã xác nhận | Không sinh chuỗi event vô hạn |

Hoàn thành khi các ca chạy tự động và UI đọc được trạng thái pending/processing/failed qua API sau khi tải lại trang. Không thực hiện các thao tác xóa queue trên môi trường thật để thử nghiệm.
