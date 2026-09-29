# 12. Điều phối đơn, tồn kho và giá

## Phạm vi

Đây là logic nghiệp vụ xác định, chạy được ngay cả khi AI ngừng. AI chỉ giải thích ngoại lệ và đề xuất ghép SKU để người có quyền xác nhận. Phụ thuộc 01–02, 11. Code ở modules `orders`, `inventory`, `pricing`, `sync`; dùng chung giữa webhook, polling và nút thử lại.

## Hợp đồng dữ liệu

- `orders`: unique tenant + store + external order ID, external state/version/time, sync time, currency, dữ liệu khách tối thiểu.
- `order_lines`: external line ID, external variant ID, mapped internal variant ID nếu có, quantity, amount, stock effect state.
- `sku_mappings`: tenant + store + external variant ID → internal variant ID; không chỉ ghép theo chuỗi SKU gần giống.
- `inventory_movements`: variant, order line/ref, loại effect, delta, old/new quantity, reason, actor, source version; unique theo logical stock effect, không theo webhook delivery ID.
- `sync_targets`: listing/variant, desired inventory/price version, sent version, confirmed version, confirmed value, status và external timestamp.

Status từ sàn phải có bảng chuyển trạng thái và ý nghĩa tồn được xác minh theo API đang dùng. Chưa biết trạng thái có cho hoàn tồn thì lưu đơn và tạo việc, không tự cộng.

## Thuật toán nhập đơn

1. Xác minh webhook tại adapter hoặc lấy đơn bằng API có scope. Normalize thành schema; ghi inbox event chống replay nếu nguồn có event ID. Hai delivery khác ID của cùng đơn vẫn phải về một order.
2. Upsert order và lines theo khóa nghiệp vụ; chỉ áp dụng transition hợp lệ, không dùng arrival time để ghi đè một trạng thái mới bằng thông báo cũ. Thiếu version/sequence rõ thì đọc lại sàn hoặc đánh dấu cần đối soát.
3. Lưu đơn ngay cả khi mapping thiếu/tồn không đủ. Transaction upsert đơn phải commit trước hoặc không bị rollback cùng transaction trừ tồn thất bại.
4. Với mỗi dòng đã map, bắt đầu transaction riêng: khóa stock effect, đọc/khóa variant đúng tenant, kiểm tra effect chưa áp dụng, cập nhật `available >= quantity` có điều kiện rồi ghi movement + outbox cùng transaction. Unique movement là lớp chống lặp cuối cùng.
5. Nếu thiếu tồn, không cập nhật quantity; đánh dấu dòng cần xử lý. Mặc định đề xuất xử lý theo từng dòng, giữ các dòng đã trừ thành công và thể hiện rõ đơn xử lý một phần. Retry chỉ thử dòng chưa có effect; không rollback rồi trừ lại dòng đã hoàn thành.
6. Hủy/hoàn chỉ tạo một movement đảo cho effect đã tồn tại và đúng điều kiện sàn chứng minh bán lại được. Đơn chưa từng trừ tồn không được cộng trả. Không coi mọi trạng thái "hoàn" là hàng đã bán lại được.
7. AI đề xuất mapping theo tên/thuộc tính nhưng không ghi mapping trực tiếp. Người có quyền duyệt → validate variant cùng tenant/store → ghi mapping → phát lại xử lý stock effect còn thiếu.

## Đồng bộ tồn và giá

Giá/tồn nội bộ là nguồn chuẩn cho app; lưu riêng giá trị sàn xác nhận. Giá người dùng sửa cần permission, expected version, currency và lý do. ORDER_MANAGER được sửa tồn nhưng không sửa giá; mọi đường API đều dùng cùng kiểm tra.

Số đăng bán đề xuất = `max(0, available - safetyBuffer)` cho mỗi mapping được cấu hình. Bán nhiều kênh vẫn có độ trễ; không cam kết tránh oversell tuyệt đối. Buffer không được trừ thêm vào tồn nội bộ khi nhận đơn.

Serialize gửi theo listing/variant và loại field. Job version cũ chưa gửi bị superseded; chỉ gửi desired version mới nhất. Response cũ chỉ xác nhận phiên bản nó gửi, không hạ confirmed version mới hơn. Unknown kết quả phải đối soát trước khi tiếp tục chuỗi gửi cùng mục tiêu nếu không bảo đảm thứ tự ngoài sàn. Echo từ sàn chỉ cập nhật observed state, không tạo event điều chỉnh tồn gốc ngược lại.

## Trình tự xây và test

Xây normalize/upsert trước, stock effect sau, sync cuối. Viết integration test đồng thời bằng hai kết nối DB độc lập và barrier, không dùng sleep tùy ý để giả lập race.

| Ca | Dữ liệu | Kết quả |
|---|---|---|
| I01 | Tồn 10, một đơn mua 3 gửi 2 lần | Một đơn, một debit movement, tồn 7 |
| I02 | Tồn 5, hai đơn mua 4 đồng thời | Một debit thành công, tồn 1; đơn kia vẫn lưu và cần xử lý |
| I03 | Hai dòng, một dòng SKU lạ | Dòng hợp lệ trừ một lần; dòng lạ chưa trừ, đơn đánh dấu một phần |
| I04 | Duyệt map SKU lạ rồi retry | Chỉ dòng còn thiếu được trừ |
| I05 | Hủy gửi lặp khi có điều kiện restock | Tối đa một reversal của movement gốc |
| I06 | Hủy chưa rõ hàng có bán lại được | Không cộng; task cần kiểm tra |
| I07 | Job tồn v2 đến sau v3 | Không ghi v2 đè v3 bên app; không gửi job v2 còn chờ |
| I08 | Webhook echo xác nhận v3 | Không phát vòng sync mới |
| I09 | ORDER_MANAGER sửa giá qua chat/API | 403, giá không đổi |

M11 cần cả bảng chi tiết và tổng hợp theo sàn/nhóm sản phẩm; tổng tiền tách currency, trạng thái chưa đồng bộ không hiển thị như số 0 đã xác nhận. M12 hiện old/new, desired/confirmed và thời điểm. Hoàn thành khi tắt AI vẫn nhận đơn, trừ tồn và đồng bộ đúng.
