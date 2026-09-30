# Kế hoạch chi tiết: Tác nhân bản địa hóa (Localization Agent)

Tài liệu này đặc tả lộ trình kỹ thuật triển khai Khối 06 theo [06-tac-nhan-ban-dia-hoa.md](file:///home/dell/Documents/projects/startup-project/docs/plan/06-tac-nhan-ban-dia-hoa.md).

## Bối cảnh và mục tiêu

Hệ thống đang phát triển theo mô hình SaaS Agent.
Tầng lưu trữ cơ sở dữ liệu bền vững (PostgreSQL, Outbox) chưa triển khai.
Toàn bộ luồng dữ liệu hiện tại chạy trên bộ nhớ và điều phối bằng DAG trong `PrepareListingOrchestrator`.
Người bán cần đưa sản phẩm sang các thị trường khu vực (Thái Lan, Singapore, Malaysia).
Nội dung sau khi sinh từ Tác nhân nội dung (Content Agent) cần được chuyển ngữ tự nhiên và giữ đúng thuật ngữ địa phương.
Hệ thống hiện tại mới chỉ có stub giả lập trong orchestrator.
Hệ thống chưa có tác nhân bản địa hóa độc lập, chưa có bộ luật chống hoán đổi thông số và chưa hỗ trợ glossary theo tenant.

Mục tiêu của kế hoạch là xây dựng module `src/ai/agents/localization` hoàn chỉnh.
Module đảm bảo chuyển ngữ chính xác ngữ cảnh thương mại điện tử.
Module bảo vệ liên kết giữa biến thể, giá trị và đơn vị.
Module ngăn chặn việc hoán đổi số liệu giữa các SKU.
Module tuyệt đối không tự ý đổi tiền tệ hoặc tự bịa đặt chứng nhận xuất xứ.
Module tích hợp cơ chế chặn tự động phê duyệt khi bản dịch cần kiểm tra lại.

## Tác động người dùng và người bảo trì

**Người bán hàng (End user).**
Người bán mở rộng thị trường sang Thái Lan hoặc Singapore với tiêu đề và mô tả chuẩn văn phong bản địa.
Tên thương hiệu, mã SKU và thông số kỹ thuật của từng biến thể được giữ nguyên chính xác.
Hệ thống phát hiện các điểm nghi vấn và yêu cầu duyệt tay thay vì tự động đăng nội dung sai lệch lên sàn.

**Kỹ sư kế thừa (Maintainer).**
Kỹ sư nhận một đường truyền dữ liệu tường minh từ workflow sang agent.
Dữ liệu đầu vào nhận đầy đủ snapshot, facts, claims nguồn và tone.
Logic bảo vệ số liệu gắn chặt giá trị với từng biến thể và chuẩn hóa đơn vị đo bằng code thuần.
Hệ thống không phụ thuộc vào độ may rủi của prompt.
Mỗi thay đổi về nội dung nguồn, tone hoặc glossary đều làm mới cache một cách chuẩn xác.

## Phạm vi

### Bao gồm trong phạm vi
- Xây dựng module `src/ai/agents/localization/` với đầy đủ types, glossary manager, protected tokens extractor, validator, prompt và generator.
- Đường truyền dữ liệu đầy đủ từ workflow vào agent gồm `title`, `description`, `highlights`, `claims`, `productFacts`, `sourceLocale`, `targetLocale` và `tone`.
- Cơ chế Pure Skip có điều kiện. Nếu ngôn ngữ nguồn trùng ngôn ngữ đích VÀ giọng văn không đổi, tái sử dụng ngay artifact nguồn mà không gọi LLM.
- Trích xuất token bảo vệ gắn liền với ngữ cảnh biến thể (Variant-aware Protected Facts). Khóa chặt bộ ba: Biến thể hoặc Thuộc tính, Giá trị và Đơn vị.
- Chuẩn hóa số liệu (Number normalization). Xử lý khác biệt dấu thập phân, khoảng trắng, quy cách kích thước và từ đồng nghĩa của đơn vị.
- Kiểm tra toàn vẹn tham chiếu claim bằng code thuần. Gắn cờ `needs_review` cho các câu dịch chưa thể chứng minh ngữ nghĩa chắc chắn để chuyển tiếp sang Khối 08.
- Quản lý Glossary theo tenant, locale và version. Mã băm cache tính trên nội dung nguồn, tone, target locale và glossary version.
- Cơ chế thực thi chặn trong Orchestrator. Trạng thái `needs_review` hoặc locale `experimental` sẽ ngăn chặn tự động duyệt tại node policy.
- Dọn sạch toàn bộ artifact hạ nguồn (`assembledData`, `reviewData`, `proposalData`) khi thực hiện lệnh `retryStep` bước localization.
- Bộ kiểm thử chuẩn hóa từ LC01 đến LC09 và bộ eval song ngữ 10 mẫu trên mỗi locale mục tiêu.

### Nằm ngoài phạm vi
- Không phụ thuộc vào cơ sở dữ liệu quan hệ hay bảng outbox. Toàn bộ state lưu qua `ICheckpointer` hiện có của workflow.
- Không tự động chọn thị trường hoặc tự động tính toán quy đổi tỷ giá tiền tệ.
- Không cam kết chống claim bịa đặt ở mức độ hiểu sâu ngữ nghĩa đa ngữ thuần bằng code. Khâu thẩm định ý nghĩa chuyên sâu do Review 08 và người duyệt đảm nhiệm.
- Không sinh ảnh hoặc dịch chữ trên hình ảnh. Việc này thuộc Khối 20.

## Ràng buộc kỹ thuật

1. **Tuân thủ Boundary Discipline.**
Việc chuẩn hóa số, gắn biến thể và kiểm tra tham chiếu claim thực hiện bằng hàm thuần ở ranh giới.
Không đưa logic kiểm tra rải rác vào các tầng điều phối.

2. **Tuân thủ Type System Discipline.**
Mở rộng trực tiếp các interface hiện có trong workflow và agent.
Không tạo thêm các wrapper type trung gian không cần thiết.
Mọi trạng thái xử lý được định kiểu cụ thể (`translated`, `skipped`, `needs_review`, `failed`).

3. **Tương thích ModelCallGateway.**
Tác nhân giao tiếp với LLM thông qua `ModelCallGateway` hiện có.
Input hash của request bắt buộc phải chứa hash nội dung nguồn, tone, locale và glossary version.

4. **Cô lập dữ liệu giữa các Tenant.**
Glossary và cache của mỗi tenant hoàn toàn độc lập trong bộ nhớ.
Không chia sẻ bộ nhớ đệm thuật ngữ giữa các khách hàng khác nhau.

## Các phương án kiến trúc và lựa chọn

1. **Phương án A: So sánh tập số phẳng.**
Tập hợp toàn bộ số trong nguồn và đích rồi so sánh hai tập hợp.
Nhược điểm: Bỏ lọt lỗi hoán đổi số giữa các biến thể (SKU A 250g, SKU B 500g bị đảo thành SKU A 500g, SKU B 250g).
Kết luận: Loại bỏ.

2. **Phương án B: Đối chiếu số liệu gắn liền ngữ cảnh biến thể (Được chọn).**
Trích xuất bộ ba gồm định danh biến thể, giá trị số đã chuẩn hóa và đơn vị đo.
So sánh trực tiếp từng cặp giá trị gắn với biến thể tương ứng.
Nếu không thể phân tích chắc chắn vị trí gắn kết, đánh dấu `needs_review` để người dùng xác nhận.
Kết luận: Chọn phương án này theo nguyên tắc **Foundational Thinking** và **Boundary Discipline**.

## Kỹ năng áp dụng (Applicable Skills)
- `principle-foundational-thinking`
- `principle-boundary-discipline`
- `principle-type-system-discipline`
- `principle-sequence-verifiable-units`
- `principle-laziness-protocol`
- `principle-prove-it-works`
- `how`
- `unslop`

## Danh sách các pha triển khai

1. [Pha 1: Hợp đồng dữ liệu và Quản lý Glossary](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/phase-1-types-and-glossary.md)
2. [Pha 2: Bộ trích xuất Thông số biến thể và Chuẩn hóa đơn vị](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/phase-2-protected-tokens-and-extractor.md)
3. [Pha 3: Bộ đối soát Thông số biến thể và Thẩm định Claim tham chiếu](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/phase-3-numeric-and-claims-validator.md)
4. [Pha 4: Đường truyền Workflow, Prompt và Bộ sinh nội dung](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/phase-4-localization-generator-and-prompt.md)
5. [Pha 5: Tích hợp Orchestrator và Cơ chế chặn duyệt tự động](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/phase-5-orchestrator-integration.md)
6. [Pha 6: Bộ kiểm thử nâng cao và Eval song ngữ chuẩn mực](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/phase-6-eval-and-adversarial-tests.md)
7. [Tài liệu kiểm thử tổng thể](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/testing.md)

## Hướng dẫn thực thi

Người thực hiện cần tuân thủ các chỉ dẫn bắt buộc:
- Đọc kỹ tài liệu từng pha trước khi viết code.
- Chạy kiểm tra tĩnh bằng `npm run typecheck` và `npm run lint`.
- Chạy kiểm tra động bằng `node --test tests/ai/localization-agent.test.mjs`.
- Tuyệt đối không làm hỏng các test hiện có trong `tests/ai/prepare-listing.test.mjs`.
- Thực hiện kiểm tra câu chữ bằng kỹ năng `unslop` trên toàn bộ tài liệu và chú thích code.
