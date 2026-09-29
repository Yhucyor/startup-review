# 11. Worker thực thi và kết nối sàn

## Mục tiêu

Chỉ gửi đúng payload đã được phép, biết phân biệt đã xếp hàng/đã gửi/sàn xác nhận và không tạo listing trùng khi lỗi mạng. Phụ thuộc 01–02, 08–10. Worker ở `apps/worker/src/execution`, adapter ở module server `marketplaces`.

Adapter là ranh giới thực sự cần hai triển khai demo/live. Các khả năng tối thiểu đề xuất: đọc capabilities/rules, tạo listing, đọc trạng thái để đối soát, cập nhật giá/tồn, lấy đơn. Không bắt adapter cài hàm mà quyền API không có; trả capability không hỗ trợ và hiển thị đúng.

## Dữ liệu và kết quả adapter

`actions` giữ tenant, proposal/hash, store, operation, idempotency key, mode, authorizationRef, `dispatchState`, desired version, external ID và timestamps. Unique `(organization_id, store_id, operation, business_key)`. `action_attempts` append-only ghi attempt ID, request fingerprint, thời điểm bắt đầu, response code đã lọc, kết quả, correlation ID.

Adapter trả một trong `confirmed`, `rejected`, `retryable_not_sent`, `unknown`. `confirmed` phải kèm ID/trạng thái xác nhận thật từ sàn; timeout sau khi đã ghi bytes ra network là `unknown`, không tùy tiện gán retryable. `dispatchState`: `pending → dispatching → confirmed | rejected | unknown`; có `blocked`, `cancelled` trước dispatch.

## Quy trình triển khai

1. Viết demo adapter lưu trạng thái bền vững trong DB test/demo, có chế độ mô phỏng 429, từ chối, timeout trước/sau tạo listing. Demo tuyệt đối không có đường gọi host thật.
2. Implement action claim bằng DB và lease/fencing. Nếu action đã confirmed trả kết quả cũ; nếu dispatching hết lease phải chuyển đối soát, không tự gửi lại create.
3. Tải lại proposal, approval/quyền hiện tại hoặc rule hiện tại, product/listing/price versions, ruleset, mode, connection và quota. Chạy 08–09 với dữ liệu hiện hành.
4. Tránh khoảng đua giữa kiểm tra và gửi: dùng khóa dispatch theo store cho worker và các mutation liên quan đến rule/connection/proposal/version. Mutation làm mất hiệu lực phải phối hợp cùng khóa; thứ tự khóa cố định. Trong vùng khóa ngắn, re-read, claim quota, ghi intent `dispatching`, rồi bắt đầu lời gọi adapter với deadline. Không giữ transaction dữ liệu dài chờ network; khóa điều phối riêng cần được giải phóng trong `finally` và khi process chết.
5. Điểm bắt đầu dispatch xác định thứ tự giữa yêu cầu gửi và tắt quy tắc. Nếu tắt đã commit trước vùng dispatch, không được gửi. Nếu dispatch đã bắt đầu, UI báo yêu cầu đang gửi không thể thu hồi; nút tắt có thể chờ khóa trong deadline rồi báo trạng thái rõ. Một worker khác thấy intent chưa có kết quả chỉ đối soát. Không hứa thu hồi gói tin đã ra mạng.
6. Gửi idempotency key tới sàn chỉ khi API chính thức hỗ trợ đúng operation. Nếu không, khóa ở DB chỉ ngăn gửi đồng thời; không giải quyết được sự cố sàn nhận thành công rồi mất phản hồi.
7. Khi unknown, tra cứu bằng external ID hoặc correlation được sàn hỗ trợ và bằng chứng payload. Tìm thấy đúng một đối tượng thì xác nhận. Không có cách xác minh chắc chắn thì tạo task `EXTERNAL_UNKNOWN`, chặn retry create tự động, giữ quota; người có quyền đối soát trước khi cho gửi lại.
8. Confirmed cập nhật listing/external ID + audit + action + outbox trong transaction. Retry chạy sau crash đọc các bản ghi này. Nếu bản dữ liệu gốc đã đổi, không phủ nhận kết quả cũ bên sàn: lưu phiên bản thực tế đã gửi và tạo việc cập nhật mới.

## Kết nối Shopee thật

Trước khi code adapter thật, kiểm tra [developer guide](https://open.shopee.com/developer-guide/4) bằng tài khoản có quyền. Ghi bảng capability gồm endpoint chính thức, scope, môi trường, giới hạn, timeout, định nghĩa success, cách đọc lại, cách xác minh webhook và cách chống trùng. Không suy đoán tên endpoint/chữ ký từ spec này.

Luồng cấp quyền dùng state một lần gắn tenant/người dùng/cửa hàng dự kiến, hạn dùng và callback URI đã đăng ký; chống đổi tenant hoặc replay callback. Token mã hóa at-rest, chỉ backend có quyền cần thiết giải mã; rotation/refresh có khóa chống refresh đồng thời. Disconnect giữ dữ liệu lịch sử và chặn job chưa gửi. Webhook kiểm tra chữ ký và chống replay đúng tài liệu trước khi ghi dữ liệu nghiệp vụ; xử lý payload quá lớn/không hợp lệ sớm.

## Test phải có

| Ca | Cách tạo lỗi | Kỳ vọng |
|---|---|---|
| X01 | Bấm đăng 10 lần và 2 worker | Một create có hiệu lực |
| X02 | Demo tạo listing rồi ném timeout | unknown; đối soát tìm được listing, không tạo lần hai |
| X03 | Crash sau ghi dispatch intent trước network | Đối soát, không tự đoán chắc chưa gửi |
| X04 | Tắt rule commit trước worker lấy khóa | 0 lời gọi adapter |
| X05 | Worker đã dispatch rồi người dùng tắt | Kết quả vẫn được lưu, UI phân biệt đang gửi với việc đã dừng |
| X06 | Token hết hạn hoặc scope thiếu | Cần kết nối lại/thiếu quyền; không báo Đã đăng |
| X07 | 429 có hướng dẫn retry | Chờ đúng policy có giới hạn, không tạo vòng gọi dồn |
| X08 | Callback sai state/tenant; webhook sai chữ ký | Từ chối, không tạo store/order |
| X09 | Mất response, sàn không có khả năng đối soát | Task kiểm tra thủ công, không retry create tự động |

Hoàn thành demo khi test qua. Hoàn thành thật chỉ khi có sản phẩm được phép đã đăng, ID sàn, đọc lại khớp và bằng chứng được lọc bí mật. Không có quyền ngoài thì ghi chưa xác minh.
