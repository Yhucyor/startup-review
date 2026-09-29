# 10. Đề xuất, phê duyệt và dòng hoạt động

## Trách nhiệm

Biến output AI thành thay đổi cụ thể để người có quyền đọc, sửa, duyệt hoặc từ chối. Phụ thuộc 01, 08–09. Module `proposals`, `tasks`, `activity` trong API; nối M08/M10/M15 và dòng hoạt động M16. Một proposal chứa một loại tác động; không gộp đăng bài, đổi giá và sửa tồn vào một nút mơ hồ.

## Hợp đồng proposal

Các trường bắt buộc: `id`, tenant, mode, kind, target store/listing/product IDs, `before`, `after`, `expectedVersions`, `payloadHash`, `sourceRefs`, `validationReportId`, `riskReasons`, run ID, creator, status. Hash tính từ payload chuẩn hóa phía server, gồm kind, target, currency, assets và versions; không nhận hash tự khai làm bằng chứng.

Proposal status: `draft → needs_input | pending_approval → approved → queued → executing → succeeded | failed | unknown`. Nhánh khác: `rejected`, `superseded`, `cancelled`. Không trộn status này với run status hoặc trạng thái listing bên sàn.

Task có `type=approval|missing_data|exception|connect_store`, proposal/ref IDs, assignee tùy chọn, status `open|snoozed|resolved|dismissed`, `snoozedUntil`, reason, dedup key. Một action thành công mới resolve task thực thi; bấm duyệt không phải đã hoàn tất.

## API và quy trình

1. `GET /tasks` phân trang theo tenant/quyền và cursor; `GET /proposals/{id}` trả before/after, nguồn, lý do, bản dữ liệu hiện hành có khác không.
2. `POST /proposals/{id}/approve` nhận `expectedProposalVersion`, `payloadHash`, `Idempotency-Key`. Trong transaction khóa proposal, kiểm tra policy, tạo approval và outbox/action có unique key. Cùng proposal/hash không có hai lần duyệt có hiệu lực.
3. Chỉnh sửa tạo revision mới, không sửa payload đã duyệt; proposal cũ superseded, approval cũ chỉ lưu lịch sử. Người dùng kiểm tra lại rồi duyệt revision mới.
4. `POST .../reject` ghi lý do tùy chọn; lưu suppression key theo tenant + target + loại đề xuất + semantic payload hash + source versions. Không gửi lại cùng đề xuất chỉ vì đổi run ID. Dữ liệu thay đổi có ý nghĩa hoặc người dùng chủ động yêu cầu mới mới tạo việc mới, liên kết việc cũ.
5. `POST /tasks/{id}/snooze` chỉ ẩn tới giờ đã chọn, không cấp quyền. Scheduler mở lại task, không tự execute.
6. Activity ghi append-only trong transaction của thay đổi: actor user/rule/worker, action, resource, before/after refs, status, lý do, correlationId. Actor hiển thị "AI đề xuất", "Người dùng duyệt", "App đã gửi", "Sàn xác nhận" đúng thực tế.
7. UI polling có cursor/run version là đủ cho bản đầu; dừng polling khi terminal, tiếp tục đọc DB sau tải lại. Không cần WebSocket nếu chưa có yêu cầu độ trễ cụ thể.

## Trải nghiệm bắt buộc

Thẻ M15 hiện cửa hàng, số đối tượng tác động, dữ liệu trước/sau, nguồn thiếu, loại tác động và nút theo quyền. Mọi trạng thái có chữ; thao tác bằng bàn phím, focus giữ ở thông báo phù hợp. Mobile 360 px không che nút duyệt. Không đưa stack trace, token hay thuật ngữ queue ra màn hình seller.

## Test

| Ca | Bằng chứng cần thấy |
|---|---|
| A01: Double click approve | Một approval/action; cùng response ID |
| A02: Người duyệt mất quyền trước gửi | Worker dừng; task có lý do |
| A03: Sửa sau duyệt | Version mới pending_approval; không gửi bản mới bằng approval cũ |
| A04: Reject rồi event lặp | Không có thẻ giống nguyên trạng xuất hiện lại |
| A05: Snooze tới ngày mai | Không thực thi và không mất task |
| A06: Viewer đọc activity đơn | PII bị lọc, chỉ link mở được theo quyền |
| A07: Đóng tab lúc approve | Mở lại thấy trạng thái DB; không tự tạo request mới |
| A08: Task B bị đổi ID vào request A | Không lộ nội dung hoặc thay status |

Hoàn thành khi người dùng đi từ proposal tới kết quả sàn qua các trạng thái lưu thật, và audit cho biết rõ ai/quy tắc nào cho phép action nào.
