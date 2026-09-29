# 18. Lập kế hoạch vào thị trường

## Mục tiêu và giới hạn

Sinh kế hoạch có khách hàng mục tiêu, định vị, giá đề xuất, thông điệp, các việc cần làm và tiêu chí đo. Không tạo hoạt động ngoài sàn, quảng cáo, xuất hàng hoặc đổi giá tự động. Phụ thuộc 03, 15–17; node `buildMarketEntryPlan` tại `ai/agents/market-plan`.

## Hợp đồng

Input: product snapshot, target market do người dùng chọn, market score/profile/version, regulation check, knowledge insights, budget/currency và mục tiêu người dùng nhập, chi phí/nguồn giá nếu có. Thiếu budget không tự bịa; tạo bản nháp có câu hỏi cần bổ sung.

Output `planVersion`, `segments`, `positioning`, `pricingHypotheses`, `messages`, `steps`, `risks`, `assumptions`, `missingData`, `sourceRefs`. Mỗi segment/message phải phân biệt dữ kiện từ dataset/review với giả thuyết AI. Mỗi step có `id`, mục tiêu, việc làm cụ thể, input cần, deliverable, dependency step IDs, người phụ trách đề xuất, tiêu chí hoàn thành và `requiresApproval`.

Giá giả thuyết phải có currency, cost/source ref, phạm vi và assumptions; nếu không đủ nguồn chỉ hỏi dữ liệu, không đưa số giả. Kế hoạch không hứa thời gian có giấy phép hoặc doanh thu nếu không có căn cứ.

## Cách xây

1. Code thu thập snapshot theo đúng tenant và market; kiểm tra dataset hiệu lực. Không đưa toàn bộ review vào prompt, chỉ insight và bằng chứng giới hạn được chọn.
2. Dựng schema output trước, test bước thiếu deliverable/dependency ID không tồn tại. Cấu hình đầu tiên giới hạn 10 bước, không sinh hàng trăm task.
3. Prompt yêu cầu tách evidence/assumption, ghi unknown, không bỏ qua legal block. LLM đề xuất bước giải quyết blocker trước thử bán.
4. Sau model, code validate nguồn, money, IDs, DAG không chu trình, không có action ngoài whitelist. Step "tự đổi giá ngay" bị từ chối như executable action.
5. Lưu plan bất biến cùng input versions. Người dùng sửa tạo revision; thay dữ liệu/luật khiến plan có nhãn cần rà soát, không tự thay plan cũ đang được sử dụng.
6. M18 cho đọc kế hoạch, nguồn và chỗ còn thiếu. Chọn "Tạo việc" tạo task nội bộ theo từng step với idempotency plan version + step ID; không là nút tự chạy toàn bộ kế hoạch.
7. Nếu step dẫn tới draft listing hoặc đề xuất giá, dùng 04 hoặc 20 rồi 08–11. Không tạo đường thực thi thứ hai trong module thị trường.

## Test

| Ca | Kỳ vọng |
|---|---|
| MP01: Đủ score/legal/knowledge | Có segment, positioning, messages và bước với nguồn truy được |
| MP02: Thiếu chi phí/FX | Không phát sinh giá chuyển đổi bịa; có missingData |
| MP03: Legal blocked | Kế hoạch ưu tiên bổ sung/xử lý, không đánh dấu sẵn sàng bán |
| MP04: Dependency A→B→A | Output bị từ chối, không tạo task |
| MP05: Tạo việc hai lần | Mỗi step một task |
| MP06: Source insight bị withdraw | Bản mới không dùng; bản cũ gắn cảnh báo stale |
| MP07: Model unavailable | Người dùng xem/sửa plan đã lưu, không mất dữ liệu |

Eval thật dùng ít nhất 5 bộ hồ sơ có người bán kiểm tra nguồn, tính cụ thể và tính khả thi; không lấy giọng văn tự tin làm tiêu chí. Hoàn thành khi có thể theo từng step để tạo công việc đo được, mọi thao tác có tác động vẫn cần cơ chế quyền/duyệt chung.
