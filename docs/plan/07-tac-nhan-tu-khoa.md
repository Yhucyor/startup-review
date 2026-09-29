# 07. Tác nhân từ khóa

## Mục tiêu

Gợi ý từ khóa liên quan để người bán dùng trong nội dung. Chạy song song với 05 từ cùng snapshot; không tuyên bố lượng tìm kiếm hoặc mức phổ biến nếu không có dữ liệu đo. Code `apps/worker/src/ai/agents/keywords`; phụ thuộc 03.

Input gồm product facts, locale đích, danh mục đã xác nhận, thương hiệu hợp lệ và danh sách từ không được dùng có version. Output có tối đa 10 mục theo cấu hình ban đầu, mỗi mục gồm `phrase`, `reason`, `sourceRefs`, `basis=product_fact|measured_dataset`, `metricRef` chỉ khi có dataset thật; thêm `warnings`.

Ví dụ hợp lệ: "cà phê rang xay 250g", lý do "đúng loại hàng và quy cách", nguồn `product.category`, `variant.weight`. Không tự gán `searchVolume=10000`, "bán chạy nhất" hoặc thương hiệu đối thủ để tăng hấp dẫn.

## Trình tự code

1. Viết normalize để trim, gộp khoảng trắng, chuẩn hóa Unicode và loại trùng theo locale; giữ nguyên bản gốc để hiển thị, không bỏ dấu tiếng Việt mặc định.
2. Viết schema giới hạn số mục/độ dài trước lời gọi model. Giới hạn này là giới hạn UI/runtime của app, không phải giới hạn Shopee.
3. Gọi cổng 03 với snapshot và locale, kiểm tra sourceRef và từ bị cấm. Không dùng danh sách từ khóa làm dữ liệu đo nhu cầu.
4. Merge chỉ khi người dùng hoặc template được chọn sử dụng từ khóa; không tự nhồi toàn bộ vào title. Bản nội dung sau merge luôn chạy lại Review.
5. Khi provider lỗi, lưu cảnh báo và để người viết tay. Keyword không bắt buộc của payload sàn thì không làm mất nháp Content; cổng 08 quyết định có thể tiếp tục đến duyệt không.

## Test

| Ca | Input/output giả | Kết quả |
|---|---|---|
| K01 | "cà phê", " cà  phê " | Còn một gợi ý |
| K02 | Từ khóa không có fact nguồn | Đánh dấu không liên quan hoặc loại bỏ, có lý do |
| K03 | Có volume nhưng không dataset | Schema/validator từ chối số đo |
| K04 | 50 từ khóa khi max 10 | Output bị từ chối hoặc cắt theo quy tắc công khai trước lưu; không vượt giới hạn |
| K05 | Tiếng Thái được chọn | Kết quả đúng locale và giữ brand/SKU |
| K06 | Node timeout | Bản Content vẫn còn và run ghi lỗi từng nhánh |

Nghiệm thu bằng 20 sản phẩm có nhóm từ phù hợp do người bán xác nhận; đo tỷ lệ gợi ý liên quan, từ sai thương hiệu và claim không nguồn. Không dùng doanh thu làm bằng chứng chất lượng nếu chưa có dữ liệu bán thật.
