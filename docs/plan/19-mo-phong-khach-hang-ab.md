# 19. Mô phỏng khách hàng và A/B

## Phạm vi

So sánh hai cách diễn đạt với nhóm persona giả lập để tìm điểm khó hiểu trước khi người bán thử thật. Không phải thí nghiệm với khách thật, không dự báo conversion/doanh thu, không tự chọn bản thắng để đăng. Phụ thuộc 03, 17–18; module `market-simulations` và agent `simulatePersona`.

## Hợp đồng và dữ liệu

`simulation_experiments`: tenant, mode, mục tiêu, product snapshot, plan/knowledge versions, variant A/B bất biến, variable tested, rubric version, model/prompt version, run budget, status. `simulation_personas`: persona ID, nhu cầu, ngân sách giả định, ngôn ngữ, evidence refs hoặc nhãn `synthetic_assumption`; không dùng danh tính khách thật. `simulation_responses`: experiment/persona/attempt, thứ tự trình bày, score theo rubric, lựa chọn, lý do, nguồn. `simulation_reports`: aggregate, variance, completed/failed counts, caveats.

Input bắt buộc hai variant khác nhau ở biến đã chọn, ví dụ tiêu đề; giữ nguyên giá/ảnh nếu thử tiêu đề. Rubric ví dụ 1–5 cho dễ hiểu, phù hợp nhu cầu, mức tin tưởng; giá trị phải trong miền. Output lựa chọn `A|B|tie|cannot_judge`, điểm, lý do ngắn và concern. Persona không có bằng chứng phải được ghi là giả định.

## Quy trình triển khai

1. UI M18 cho chọn mục tiêu, trường muốn so, A/B và ngân sách lượt model. Validate hai variant, cỡ mẫu và quyền trước tạo run.
2. Tạo cohort đề xuất ban đầu 12 persona giả lập, 2 thứ tự trình bày cho mỗi persona, tối đa 24 responses; đây là giới hạn chi phí thử nghiệm, không là cỡ mẫu thống kê đại diện dân số. Người dùng có thể giảm nhưng không vượt budget/quota.
3. Lưu seed cho việc lấy mẫu/thứ tự; đảo A/B có cân bằng và không cho prompt biết bản nào người bán thích. Seed chỉ làm lặp lại lịch phân công, không bảo đảm LLM tái tạo đúng từng câu.
4. Với từng response, dùng 03, validate rubric/lựa chọn; lỗi ghi failed và có retry trong tổng ngân sách. Không tính response thiếu thành điểm 0 hoặc tự bỏ để tô đẹp kết quả.
5. Code tính số lựa chọn, trung bình rubric, độ phân tán và khác biệt theo thứ tự. Hai response từ cùng persona không được quảng cáo là hai khách độc lập.
6. Report ghi rõ "Mô phỏng AI, chưa kiểm chứng với khách hàng thật", model/prompt/dataset versions, số persona/responses thành công, limitations. Không gắn p-value/độ tin cậy khách hàng thật từ kết quả LLM tự sinh.
7. Seller chọn một variant thì tạo revision draft, chạy 08–10. Không tự đăng bản thắng; không A/B live trên sàn khi chưa có capability và thiết kế thí nghiệm riêng.

## Test

| Ca | Kỳ vọng |
|---|---|
| AB01: Response giả với điểm đã biết | Aggregate tính chính xác, tie/cannot_judge được đếm riêng |
| AB02: A/B đổi cả title và price trong test title | Validation yêu cầu tách biến hoặc ghi lại mục tiêu thí nghiệm |
| AB03: 4/24 response lỗi | Report 20/24, không coi đủ mẫu |
| AB04: Score 6 trên thang 1–5 | Bị từ chối |
| AB05: Chọn B sau khi product thay đổi | Draft mới cần check version và duyệt lại |
| AB06: Hai request Start cùng key | Một experiment, không nhân đôi ngân sách |
| AB07: Model bias theo thứ tự | Report phát hiện từ fixture đảo thứ tự; không che kết quả trái chiều |

Hoàn thành khi phép tổng hợp có test xác định, kết quả lưu và mở lại được, tất cả màn hình/export đều giữ nhãn mô phỏng. Thử nghiệm khách thật là dự án tiếp theo với nguồn đo và đồng ý thu thập dữ liệu riêng.
