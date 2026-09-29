# 04. Bộ điều phối có trạng thái

## Mục tiêu

Nhận event đã lưu, chọn đúng quy trình, gọi các tác nhân cần thiết và giữ kết quả qua restart. Code đề xuất `apps/worker/src/ai/workflows/prepare-listing`. Phụ thuộc 01–03; kết nối các node 05–10 theo từng mốc. LangGraph giữ bước workflow, BullMQ giao việc và đánh thức lại; PostgreSQL giữ quyết định nghiệp vụ.

## Đầu vào, state và đầu ra

Input: event ID, tenant, mode, product snapshot, store, locale đích, yêu cầu cụ thể (`prepare_listing`, `rewrite_content`, `retry_step`). Router chọn từ enum whitelist bằng code; LLM có thể đề nghị intent cho chat nhưng không tự tạo tên workflow.

State tối thiểu: `runId`, `workflowVersion`, `snapshotRefs`, `selectedNodes`, các artifact ID của content/localization/keywords/review, `warnings`, `attemptCounters`, `proposalId`, `checkpointVersion`, `status`. Không lưu token kết nối hoặc dữ liệu có thể đọc lại bằng ID nếu không cần đóng băng nó.

Run status: `queued → running → waiting_input | waiting_approval | completed | failed | cancelled | superseded`. `waiting_approval` không có worker giữ kết nối chờ. Resume phải kiểm tra run còn đúng trạng thái và proposal/version tương ứng; kết thúc tạo nháp không đồng nghĩa listing đã đăng.

## Sơ đồ bước và lựa chọn

| Bước | Chạy khi nào | Dữ liệu cần |
|---|---|---|
| Load snapshot | Mọi run | Phiên bản bất biến và tenant được xác thực |
| Content | Cần tạo/viết lại nội dung | Fact sản phẩm và hướng dẫn seller |
| Keywords | Người dùng hoặc workflow cần từ khóa | Snapshot, locale đích; độc lập Content |
| Localization | Ngôn ngữ nội dung khác locale đích | Artifact Content hoàn tất hoặc bản nguồn đã khóa |
| Assemble | Nhánh đã chọn xong | Kết quả từng nhánh, trường do người sửa được bảo vệ |
| Review + rule validation | Mọi bản nháp định gửi/duyệt | Toàn bộ bản cuối và source snapshot |
| Create proposal | Có bản hợp lệ để xem | Payload/hash/nguồn/cảnh báo |
| Policy | Có proposal | Quyền/quy tắc hiện hành; trả task hoặc action được phép |

Content và Keywords có thể chạy song song; Localization phải sau Content; Review chỉ đọc bản cuối. Bỏ node không cần, ví dụ viết lại tiếng Việt không chạy Localization. Lỗi keywords có thể cho lưu nháp với cảnh báo nếu sàn không yêu cầu; không tự đăng khi còn bước kiểm tra bắt buộc chưa đạt.

## Triển khai từng bước

1. Viết test routing cho từng intent/language trước. Dùng node giả trả artifact và đếm lần chạy.
2. Tạo graph có hàm node nhỏ; state nhánh ghi các khóa riêng, khi join kiểm tra cùng snapshot version. Không dùng một chuỗi text chung để các agent ghi đè nhau.
3. Tích hợp durable checkpointer phù hợp phiên bản LangGraph đã chốt. Theo [hướng dẫn LangGraph](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph), bước chờ người dùng là một điểm ngắt; trong dự án, approval/action vẫn phải được lưu và kiểm tra ở DB nghiệp vụ.
4. Mỗi node lưu artifact theo unique run + node + input hash; node chạy lại đọc kết quả đã commit. Side effect tạo task/proposal có unique key trước điểm ngắt để replay không nhân bản.
5. Resume từ approval qua outbox; payload resume chỉ mang ID, node đọc quyết định hợp lệ từ DB. Không nhận `approved=true` do client truyền như bằng chứng.
6. Cùng một run chỉ có một lease owner; worker cũ bị fencing khi lease hết. Nếu graph/checkpoint và DB nghiệp vụ lệch, đọc bản ghi đã commit để sửa checkpoint, không thực thi lại mù quáng.
7. Cancel đặt cờ bền vững, kiểm tra trước mỗi node và trước dispatch. Kết quả LLM về muộn không được đưa thành proposal active. Yêu cầu đã gửi sàn cần đối soát, không ghi cancelled như thể chưa có tác dụng.
8. Nâng workflow version chỉ áp dụng run mới; run cũ tiếp tục bằng handler tương thích hoặc dừng rõ để migrate. Không đổi thứ tự điểm ngắt trên run đang chờ mà không có kế hoạch chuyển đổi.

## Test cần có

| Ca | Kỳ vọng đo được |
|---|---|
| O01: chỉ viết lại tiếng Việt | Content 1, Localization 0, node khác theo route đã chọn |
| O02: Content 300 ms, Keywords 300 ms | Cùng khởi động trước khi nhánh kia kết thúc; không assert thời gian tuyệt đối dễ flaky |
| O03: Localization lỗi | Content/Keywords được giữ; retry chỉ chạy Localization và các bước phụ thuộc |
| O04: Restart tại waiting_approval | Task còn nguyên, không có action trước duyệt, không gọi lại model đã lưu |
| O05: Hai approval event giống nhau | Một resume có hiệu lực, một action |
| O06: Product đổi giữa hai nhánh | Không join hai snapshot; run cũ superseded hoặc cần kiểm tra lại |
| O07: Cancel khi LLM đang chạy | Output về muộn không kích hoạt gửi sàn |

Hoàn thành khi có thể trình diễn toàn bộ graph với node giả, sau đó thay từng node bằng agent thật mà không thay hợp đồng policy/action.
