# 16. Đánh giá và chấm điểm thị trường

## Mục tiêu

Hiển thị mức phù hợp của từng quốc gia bằng công thức có thể tính lại, cùng dữ liệu và giới hạn. LLM giải thích, code tính điểm. Phụ thuộc 01, 03, 15; có thể dùng insight 17 khi dữ liệu đủ chất lượng. M18 nhận kết quả; code ở `modules/market-analysis`.

## Dữ liệu và output

`market_datasets`: tenant, country, ngành hàng, source, thời kỳ đo, collectedAt, validUntil, license/use permission, version, reviewer, mode. `market_metrics`: metric key, value, unit, direction, normalization bounds, sample count, confidence/quality do quy tắc xác định, source row ref. `scoring_profiles`: tên, version, metric weights, thresholds, approvedBy. `market_scores`: product snapshot, datasets/profile version, component scores, coverage, status, findings.

Input gồm product/category, danh sách quốc gia, profile đã duyệt và ngày đánh giá. Output mỗi quốc gia có `score` hoặc null, `coverage`, `components`, `eligibility`, `sourceRefs`, `missingMetrics`, `explanation`. Điểm không phải xác suất bán thành công; không gán 82/100 vì đó là ví dụ trong README.

## Công thức bản đầu đề xuất

Profile thử nghiệm có các thành phần: nhu cầu 35%, biên lợi nhuận 30%, mức cạnh tranh thuận lợi 20%, mức phù hợp vận hành 15%. Đây là cấu hình giả định để triển khai/test, phải được người dùng phê duyệt trước phân tích thật. Rủi ro pháp lý là điều kiện chặn riêng, không lấy điểm nhu cầu cao bù cho bị cấm.

Mỗi metric có bounds L/U đã duyệt: hướng tăng tốt dùng `clamp(100 × (x-L)/(U-L), 0, 100)`, hướng giảm tốt dùng `100 - normalized`. U phải lớn hơn L; không chuẩn hóa bằng min/max của đúng danh sách quốc gia đang xem vì thêm quốc gia sẽ làm đổi điểm quốc gia cũ.

`coverage = tổng trọng số metric có dữ liệu hợp lệ`. Nếu coverage < 0.8, score null. Nếu đủ, `score = tổng(weight × normalizedScore)/coverage`, làm tròn một chữ số khi hiển thị, lưu giá trị tính nguyên/tỷ lệ chính xác. Metric quá hạn coi là thiếu. UI luôn hiện coverage và không xếp chung dữ liệu thiếu với dữ liệu đầy đủ mà giấu mức bao phủ. Country bị legal blocked không được đề xuất bán dù điểm khác cao; legal unknown ghi cần kiểm tra.

Ví dụ fixture đầy đủ có component 80, 60, 70, 90: điểm = 28 + 18 + 14 + 13.5 = 73.5. Đây là phép thử công thức, không phải đánh giá quốc gia thật.

## Trình tự xây

1. Xây schema import CSV/manual cho metric và nguồn; kiểm tra đơn vị, kỳ thời gian, duplication và quyền sử dụng. Không bật scraper đối thủ thời gian thực.
2. Viết hàm normalize và score thuần kèm test biên, rồi lưu profile/dataset version. Không để model sinh số liệu đầu vào mà không nguồn.
3. Ghép pháp lý từ 15. Thiếu chi phí vận chuyển/thuế phục vụ phân tích lợi nhuận thì ghi missing; việc dùng chi phí phân tích không có nghĩa app làm logistics.
4. Tạo analysis run nền; ghi snapshot input và kết quả. LLM nhận đúng component scores đã tính để giải thích điểm mạnh/yếu, không tự sửa score.
5. M18 hiển thị biểu đồ thành phần, nguồn/ngày, coverage, phạm vi sản phẩm, chặn/thiếu dữ liệu. Cho mở lại phân tích cũ theo version.

## Test

| Ca | Kỳ vọng |
|---|---|
| MS01: Component fixture 80/60/70/90 | 73.5, tính lại không gọi LLM |
| MS02: Thiếu metric weight 0.35 | coverage 0.65, score null |
| MS03: Giá trị ngoài bounds hoặc U=L | Clamp đúng; profile U=L bị từ chối |
| MS04: Dataset quá hạn/khác đơn vị | Không âm thầm tính như dữ liệu hợp lệ |
| MS05: Điểm cao nhưng legal blocked | Không đề xuất thị trường đủ điều kiện |
| MS06: Đổi profile version | Phân tích mới; kết quả lịch sử không bị ghi đè |
| MS07: Không dữ liệu thật | M18 hiện chưa có dữ liệu hoặc fixture có nhãn, không điểm thật giả |

Hoàn thành khi người lập trình độc lập tính lại được từng điểm bằng cùng dataset và profile, và người dùng thấy lý do đủ/thiếu điều kiện.
