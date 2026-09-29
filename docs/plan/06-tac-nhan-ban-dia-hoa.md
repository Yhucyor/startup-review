# 06. Tác nhân bản địa hóa

## Trách nhiệm và hợp đồng

Chuyển cách diễn đạt sang locale người dùng chọn sau khi có nội dung nguồn. Không tự chọn thị trường, không xác nhận hợp pháp, không đổi giá/tiền tệ. Node `localizeContent` tại `apps/worker/src/ai/agents/localization`; phụ thuộc 03, 05.

Input: artifact nội dung có version, fact gốc, `sourceLocale`, `targetLocale`, glossary doanh nghiệp có version, danh sách từ/tên/SKU/số/đơn vị phải giữ. Output gồm `title`, `description`, `highlights`, `claimMappings` nối đoạn dịch với claim nguồn, `untranslatedTerms`, `warnings`, `locale`. Mỗi đoạn dịch có claim kế thừa nguồn gốc, không trỏ vào bản dịch như bằng chứng duy nhất.

## Cách triển khai

1. Viết điều kiện skip thuần: hai locale bằng nhau và không có yêu cầu đổi giọng văn thì dùng artifact nguồn, ghi bước `skipped`.
2. Server dựng danh sách bảo vệ: brand, SKU, lượng, kích cỡ và các fact cấu trúc. Không yêu cầu người dùng viết prompt để giữ những dữ liệu này.
3. Prompt cho phép dịch tên đơn vị theo glossary nhưng không đổi lượng. Chuyển tiền tệ hoặc đổi đơn vị có phép tính thuộc thao tác riêng được người dùng yêu cầu, ngoài node này.
4. Lưu glossary theo tenant, locale và version; cache key phải chứa glossary version. Mâu thuẫn thuật ngữ tạo cảnh báo để người bán chọn.
5. So sánh số và fact sau dịch bằng code theo normalization được định nghĩa; trường hợp không phân tích chắc chắn đặt `needs_review`, không mặc định hợp lệ. Review 08 kiểm tra lại ý nghĩa toàn bản.
6. Lưu artifact mới, không thay bản nguồn. M08 hiển thị hai ngôn ngữ và nguồn. Không có glossary vẫn dịch được nhưng giữ nguyên brand/SKU và cảnh báo thuật ngữ chưa xác nhận khi cần.

## Test và nghiệm thu

| Ca | Kỳ vọng |
|---|---|
| LC01: vi-VN → vi-VN | Không gọi LLM; artifact nguồn được tái sử dụng |
| LC02: 250 g → bản dịch ghi 500 g | Validation báo sai fact, không tới tự đăng |
| LC03: Giá nguồn VND, locale Thái | Không sinh giá THB hoặc tỷ giá |
| LC04: Glossary A khác glossary B | Dịch/cache tách tenant và version |
| LC05: Bản dịch tự thêm "đạt chuẩn nhập khẩu" | Claim không nguồn, bị chặn |
| LC06: Localization lỗi, Content thành công | Chỉ retry nhánh dịch, giữ bản Content |

Tạo bộ eval song ngữ tối thiểu 10 mẫu/locale với người đọc được ngôn ngữ đó kiểm tra tên, số, ý nghĩa. Chưa có người/dữ liệu kiểm tra thì locale có trạng thái thử nghiệm và không dùng cho tự đăng. Hoàn thành khi kết quả có mapping nguồn và một lần sửa glossary làm cache cũ không còn hiệu lực.
