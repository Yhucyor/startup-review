# 15. Khối quy định và pháp lý

## Phạm vi và điều kiện mở

Đối chiếu sản phẩm với bộ quy định do người dùng nhập và người có chuyên môn rà soát. Không tự tìm/bịa luật, không cấp chứng nhận hợp pháp hoặc tự nộp hồ sơ hải quan. Phụ thuộc 01, 03, 08. Code ở `modules/regulations`, agent hỗ trợ trích xuất/giải thích ở `ai/agents/regulations`.

Do README chưa có dữ liệu luật thật, bản đầu xây được schema, công cụ nhập, kiểm tra với fixture có nhãn. Thị trường chưa có bộ dữ liệu được duyệt phải hiển thị `unknown`; không báo "không vi phạm" chỉ vì truy vấn trả rỗng. Pháp lý chỉ bắt buộc cho phạm vi thị trường/ngành hàng đã cấu hình; không chặn mọi listing Shopee nội địa vì một dataset xuất khẩu chưa tồn tại.

## Dữ liệu và hợp đồng

| Bảng | Nội dung |
|---|---|
| `regulation_sources` | Tenant, nguồn chính thức/nguồn người nhập, tên tài liệu, URL/file, checksum, cơ quan ban hành, quốc gia, ngôn ngữ, ngày thu thập |
| `regulation_versions` | Source, version, effectiveFrom/effectiveTo, supersedes, status draft/reviewed/withdrawn, reviewer/time |
| `regulation_rules` | Version, ngành hàng/mã phân loại đã xác nhận, điều kiện áp dụng, predicate, required facts/docs, mức độ, trích đoạn và vị trí |
| `regulation_checks` | Product snapshot, thị trường, ngày kiểm tra, ruleset version, findings, coverage gaps, status |

Predicate chỉ hỗ trợ whitelist ban đầu: field bằng một giá trị, thuộc tập, lớn/nhỏ hơn ngưỡng với đơn vị rõ, tồn tại chứng từ và ngày hết hạn. Không `eval` text luật. Điều khoản không biểu diễn chắc bằng predicate được gắn `manual_review_required`.

Input `checkRegulations` gồm tenant, product snapshot, origin/destination markets, category/classification đã xác nhận, intended use, sale date và documents. Output `status=clear_within_dataset|blocked|needs_review|unknown`, finding với rule ID/version/source/đoạn trích/vị trí, fact đã so và fact thiếu. `clear_within_dataset` chỉ nghĩa bộ dữ liệu đang xét không thấy lỗi, không có nghĩa pháp lý toàn diện đã được xác nhận.

## Quy trình từ nhập đến kiểm tra

1. Làm giao diện nhập file/text/URL và metadata; chỉ OWNER/ADMIN được phân quyền quản lý dữ liệu nguồn. Tải URL qua fetch an toàn, giới hạn file/định dạng; coi nội dung tài liệu là dữ liệu không tin cậy.
2. Trích text bằng parser được chọn sau khi được duyệt dependency. Với scan cần OCR mà chưa hỗ trợ, báo cần nhập text, không giả có nội dung.
3. Agent có thể đề xuất rules/đoạn trích từ văn bản đã lưu; kiểm chứng đoạn trích có thật bằng offset/checksum. Người rà soát xác nhận điều kiện và ngày hiệu lực trước khi version được dùng cho quyết định.
4. Query bằng code theo tenant + quốc gia + loại sản phẩm + ngày hiệu lực. Phạm vi chưa biết trả unknown/needs_review; không dùng embedding similarity để quyết định một luật có áp dụng hay không.
5. Chạy predicate với fact snapshot. Missing fact và chứng từ hết hạn tạo finding. Hai điều khoản mâu thuẫn chưa có quy tắc ưu tiên được chuyên gia duyệt phải chuyển người rà soát.
6. LLM chỉ giải thích finding với trích nguồn đã truy xuất. Output không có nguồn bị từ chối; code kết luận và mức chặn không bị model hạ xuống.
7. Nối kết quả vào 08–09; nguồn bị rút lại/luật hết hiệu lực làm report liên quan stale. Tạo việc kiểm tra lại, không tự xóa listing đã đăng hoặc tự xác nhận vẫn hợp pháp.

## Test

Dùng "Quy định thử nghiệm TEST-001" giả định yêu cầu chứng từ A cho loại hàng B ở thị trường X, gắn nhãn rõ không phải luật thật.

| Ca | Kết quả |
|---|---|
| LG01: Đúng phạm vi, thiếu chứng từ A | needs_review/block theo rule fixture, chỉ ra trường thiếu |
| LG02: Không có dữ liệu thị trường Y | unknown, không có câu "đã đạt pháp lý" |
| LG03: Rule hiệu lực từ 01/10, sale date 29/09 | Không dùng như rule đang có hiệu lực; ghi version được chọn |
| LG04: Source của tenant B | Không truy xuất/không làm citation |
| LG05: Model bịa số điều/đoạn trích | Validator từ chối |
| LG06: Hai luật mâu thuẫn hoặc category chưa rõ | needs_review, không tự chọn luật dễ hơn |
| LG07: Rule bị withdraw sau lúc kiểm tra | Report stale, autoPublish bị kiểm tra lại |

Hoàn thành kỹ thuật khi import → rà soát → version → check → policy chạy với fixture và audit. Hoàn thành dữ liệu thật cần nguồn, ngày hiệu lực, phạm vi bao phủ và người kiểm tra được ghi rõ; đây là điều kiện bàn giao riêng.
