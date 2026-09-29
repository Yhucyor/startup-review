# 09. Cổng chính sách và tự động hóa

## Vai trò

Hàm code `evaluateActionPolicy(context, proposal)` xác định proposal có thể được thực hiện, cần duyệt, cần dữ liệu hay bị chặn. Không gọi model. Dùng chung cho UI, chat, tự động hóa và worker ngay trước dispatch. Phụ thuộc 01, 08; code tại module server `automation`.

## Quy tắc được lưu

`automation_rules`: tenant, store, version, mode vận hành `suggest_only|approval_required|rules_based`, công tắc draft/check/orderSync/inventorySync/priceSync/autoPublish, phạm vi product/SKU/category, daily publish limit, timezone IANA của cửa hàng, ngưỡng chênh giá, điều kiện chặn, người cấp/cập nhật, enabled, paused. OWNER đặt giới hạn trần; ADMIN chỉ thay trong phạm vi được OWNER cấp. Mặc định draft/check/orderSync/inventorySync bật, autoPublish tắt; priceSync phải được cấu hình rõ, không tự đổi giá gốc.

Input gồm actor đã xác thực, action kind, proposal/hash, product/listing/price versions, store connection/capabilities, validation report, approval hoặc rule hiện hành, usage/quota. Output gồm `decision`, `reasonCodes`, `requiredPermission`, `authorizationRef`, `checkedVersions`; quyết định là `allow|require_approval|needs_input|deny`.

## Thứ tự kiểm tra bắt buộc

1. Tenant/mode của mọi đối tượng cùng phạm vi; actor còn quyền thao tác gốc. Duyệt đề xuất giá cần quyền sửa giá, không chỉ quyền xem AI.
2. Loại action nằm trong whitelist. AI tự đổi tồn/giá, trả lời khách, hoàn tiền hoặc đổi quyền luôn không được phép.
3. Proposal active, payload hash và product/listing/price version còn khớp; report kiểm tra đúng bản cuối và ruleset hiện hành.
4. Thiếu fact, unsupported claim, validation block, unknown pháp lý trong phạm vi bắt buộc, ruleset chưa xác minh hoặc kết nối hết hạn: dừng. Duyệt bằng người không xóa các hard block này; phải sửa/bổ sung rồi kiểm tra lại.
5. `suggest_only`: không gửi sàn. `approval_required`: cần approval đúng hash/action/target và người duyệt vẫn có quyền. `rules_based`: nếu autoPublish, phạm vi, ngưỡng và quota đều đạt thì có thể cấp quyền bằng rule; nếu chỉ thiếu ủy quyền tự động thì chuyển duyệt, không làm mất nháp.
6. Tạm dừng đăng tự động chặn authorization bằng rule, kể cả job đã xếp hàng; đăng bằng người vẫn theo quyền riêng và bản xem trước. Nếu sản phẩm cần nút dừng tất cả gửi, đó là cờ vận hành `dispatchPaused` khác có ý nghĩa rộng hơn.
7. Giới hạn tự đăng/ngày được đặt chỗ nguyên tử theo store + ngày tại timezone cấu hình. Tổng sent + reserved không vượt limit. Unknown external result giữ reservation; chỉ giải phóng khi chứng minh chưa gửi/đã thất bại không tạo listing.
8. Lưu policy decision với reason code, phiên bản và authorizationRef. Worker không dùng `allow` đã lưu từ nhiều phút trước để gửi; khối 11 kiểm tra lại và chuyển trạng thái dispatch theo cơ chế cạnh tranh được định nghĩa.

`MAX_PRICE_CHANGE` so sánh giá nguyên tệ cùng currency bằng số nguyên; giá gốc bằng 0 phải có quy tắc riêng, mặc định yêu cầu duyệt. Không chia float để so sánh tỷ lệ. Quota đăng không chặn đồng bộ tồn hợp lệ vì đây là hai loại thao tác khác nhau.

## M17 và API

`GET/PUT /stores/{id}/automation` có expected rule version. UI hiển thị phạm vi cụ thể, mặc định tự đăng tắt, giới hạn/ngày, nút tạm dừng đăng tự động và audit thay đổi. Request vượt trần ADMIN trả 403 kể cả sửa body trực tiếp. Rule version tăng làm các quyết định chờ phải được đánh giá lại.

## Test ma trận

| Ca | Kỳ vọng |
|---|---|
| P01: Mặc định, listing hợp lệ | require_approval, không action tự gửi |
| P02: OWNER bật autoPublish cho P1, job P2 | P2 cần duyệt, P1 chỉ allow nếu mọi điều kiện khác đạt |
| P03: STAFF bấm duyệt/gọi API trực tiếp | deny |
| P04: Duyệt rồi sửa product hoặc payload | stale; approval không còn hiệu lực |
| P05: Hai worker cùng xin suất cuối | Chỉ một giữ được reservation |
| P06: Tắt rule trước dispatch | Job chưa chuyển dispatch bị dừng |
| P07: ADMIN nâng limit vượt OWNER | 403, rule version không đổi |
| P08: AI confidence=0.99 nhưng claim không nguồn | needs_input/deny, không tự đăng |
| P09: Rule hợp lệ nhưng store disconnected | Không gọi adapter |
| P10: Đổi ngày theo timezone và đổi timezone giữa ngày | Không reset quota để lách giới hạn; thay timezone áp dụng kỳ kế tiếp |

Hoàn thành khi cùng proposal cho cùng trạng thái tạo cùng quyết định ở mọi đường gọi, và kiểm thử race quota/dừng rule dùng DB thật.
