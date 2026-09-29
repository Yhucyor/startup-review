# 17. Market Knowledge Base từ review

## Trách nhiệm

Chuyển review được phép sử dụng thành bằng chứng và insight có nguồn cho nội dung/kế hoạch. "Học" ở đây là cập nhật kho dữ liệu và truy xuất, không tự huấn luyện lại mô hình. Phụ thuộc 01–03; code `modules/knowledge` và `ai/agents/review-insights`.

## Input và dữ liệu lưu

Nhập CSV/manual hoặc API review chính thức nếu adapter có quyền; không giả định quyền đọc review có sẵn cùng quyền đọc đơn. Review schema: tenant, source, externalReviewId hoặc import row key, product/category, market, locale, rating nếu có, text, occurredAt, importedAt, usagePermission, checksum, mode. Loại tên, điện thoại, email, địa chỉ trước khi gửi model; giữ bản thô hạn chế quyền nếu có nhu cầu rõ.

`knowledge_documents` giữ nguồn/version/status, `knowledge_chunks` giữ đoạn text đã lọc và vị trí, `review_insights` giữ theme, sentiment, need/painPoint, supporting/rebutting chunk IDs, sample size, date range và limitations. Mọi khóa/index/cache gắn tenant. Không dùng review của A làm kiến thức riêng của B.

## Quy trình triển khai

1. Làm preview import giống CSV catalog: dòng hợp lệ/lỗi, chỉ commit dòng đã xác nhận; dedup theo source + external ID hoặc checksum có ngữ cảnh. Review sửa nội dung tạo version mới.
2. Lọc PII, chuẩn hóa text và tách theo đoạn với giới hạn kích thước; lưu offset để citation mở đúng câu. Không cắt thành đoạn mất câu phủ định.
3. Bản đầu dùng tìm kiếm text PostgreSQL theo tenant/product/market/locale/date; xây bộ query tiếng Việt mẫu để kiểm tra khả năng tìm kiếm. Chỉ thêm embedding/vector khi đo retrieval thấy thiếu recall; đây là dependency và chi phí cần xét riêng.
4. LLM trích aspect/sentiment từ từng nhóm nhỏ, yêu cầu evidence ID và đoạn trích thật. Code kiểm tra trích đoạn tồn tại trong chunk, giới hạn tối đa insight/nhóm để tránh vòng lặp.
5. Code tổng hợp số review hỗ trợ/phản bác theo review ID duy nhất, không đếm chunk như các khách hàng riêng. Không suy ra tất cả khách hàng đều thích từ hai review tích cực.
6. Lưu insight version. Khi truy xuất cho 05/18, review là ý kiến khách hàng, không là chứng nhận hoặc sự thật kỹ thuật. Claim "khách phản ánh bao bì khó mở" không biến thành "bao bì đạt chuẩn".
7. Khi nguồn bị xóa/rút quyền, vô hiệu chunk/index/cache/insight phụ thuộc và tạo version mới. Consumer không tiếp tục cite dữ liệu đã bị rút.

## API và giao diện

`POST /knowledge/imports` trả preview/import ID; `POST /knowledge/imports/{id}/confirm` tạo job; `GET /knowledge/insights` lọc theo quyền; `GET /knowledge/sources/{id}` mở nguồn được phép. M18 có mẫu số, thời gian, nguồn, nhãn demo, trạng thái đang nhập/thất bại và nút xem review hỗ trợ lẫn phản bác.

## Test

| Ca | Kỳ vọng |
|---|---|
| KB01: Nhập cùng file hai lần | Không đếm đôi review/insight |
| KB02: Review chứa số điện thoại và lệnh prompt injection | PII không đến model/log; lệnh không đổi quyền/tool |
| KB03: Review "không tốt" | Chunk còn phủ định; eval không được thành lời khen |
| KB04: 1 review tách 3 chunk | Sample size vẫn 1 |
| KB05: Search A bằng ID/chữ trùng với B | Không trả chunk B |
| KB06: Rút quyền source | Không truy xuất lại trong answer/cache mới |
| KB07: Có 2 review trái chiều | Insight giữ cả nguồn hỗ trợ và phản bác |

Fixture eval tối thiểu 30 review tiếng Việt gồm lặp, trái chiều, PII, spam và câu mơ hồ. Đo retrieval bằng câu hỏi có danh sách review đúng; kiểm tra citation precision trước khi nối sinh kế hoạch. Hoàn thành khi insight mở được nguồn và tái tính được sample count.
