# Pha 6: Bộ kiểm thử nâng cao và Eval song ngữ chuẩn mực

Quay lại [Tổng quan kế hoạch](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/overview.md).

## Mục tiêu

Xây dựng bộ eval song ngữ chuẩn mực với tối thiểu 10 mẫu trên mỗi locale mục tiêu theo quy định của Khối 06.
Tách bạch rõ ràng giữa kiểm thử tự động trên pipeline và quy trình đánh giá chất lượng dịch thực tế bởi con người.
Lưu giữ đầy đủ siêu dữ liệu phiên bản mô hình, prompt và glossary cùng kết quả đánh giá.
Đảm bảo các thị trường chưa qua kiểm định của người bản địa được gắn cờ `experimental` để cấm tự động đăng bài.

## Các tệp thay đổi

1. `tests/fixtures/localization-eval-dataset.json`.
Bộ dữ liệu gồm 10 mẫu sản phẩm thực tế cho cặp tiếng Việt sang tiếng Thái và 10 mẫu cho cặp tiếng Việt sang tiếng Anh.

2. `tests/ai/localization-pipeline-eval.test.mjs`.
Tệp kiểm thử hồi quy tự động.
Kiểm tra khả năng bảo toàn 100% mã SKU, thương hiệu và thông số biến thể trên toàn bộ tập dữ liệu mẫu.

3. `tests/ai/localization-adversarial.test.mjs`.
Tệp kiểm thử các cuộc tấn công prompt injection nhằm thay đổi nhãn hàng hoặc ép mô hình đưa ra cam kết y tế sai sự thật.

4. `docs/eval/localization-human-review-template.md`.
Mẫu biểu hướng dẫn và ghi nhận kết quả đánh giá thực tế của người kiểm định song ngữ.

## Phân định hai tầng đánh giá (Two-tier Evaluation)

1. **Tầng 1: Kiểm thử tự động trên pipeline (Automated Pipeline Checks)**
- Ngưỡng đạt: Tỷ lệ bảo toàn biến thể và số học đạt tuyệt đối 100% (20/20 mẫu).
- Ngưỡng đạt thương hiệu: 100% tên nhãn hàng không bị biến dạng.
- Chặn tiền tệ: Tuyệt đối 0% trường hợp tự sinh ký hiệu tiền tệ ngoại lai.

2. **Tầng 2: Đánh giá chất lượng thực tế bởi con người (Human Benchmark)**
- Tiêu chí: Người đọc hiểu thành thạo ngôn ngữ đích trực tiếp chấm điểm độ trôi chảy và tính tự nhiên của văn phong bán hàng.
- Thang điểm: Chấm trên thang điểm 1 đến 5 (Độ chính xác thông tin và Độ tự nhiên câu từ).
- Ngưỡng kích hoạt tự động đăng: Tối thiểu 9/10 mẫu đạt điểm 4 trở lên.
- Nếu một locale chưa hoàn thành đánh giá Tầng 2, cờ `isExperimentalLocale` được bật thành `true` để cấm auto-publish.

## Lưu trữ siêu dữ liệu đánh giá (Eval Run Metadata)

Mỗi lần chạy đánh giá đều ghi lại bản ghi gồm:
- `evalTimestamp`: Thời điểm thực hiện.
- `modelConfigId`: Mô hình được gọi (ví dụ `gpt-4o-mini`).
- `promptVersion`: Phiên bản prompt (`LOCALIZATION_PROMPT_VERSION`).
- `glossaryVersion`: Phiên bản từ điển thuật ngữ được áp dụng.
- `locale`: Cặp ngôn ngữ thực hiện.
- `metrics`: Kết quả kiểm tra số học và tính toàn vẹn thương hiệu.

## Xác minh và nghiệm thu

**Kiểm tra tĩnh.**
Chạy `npm run typecheck`.

**Kiểm tra động.**
1. Chạy `node --test tests/ai/localization-pipeline-eval.test.mjs`. Xác nhận toàn bộ 10 mẫu tiếng Thái và 10 mẫu tiếng Anh vượt qua bài kiểm tra số học và thương hiệu.
2. Chạy `node --test tests/ai/localization-adversarial.test.mjs`. Xác nhận tác nhân phòng thủ thành công trước các chuỗi prompt injection có chủ đích.
3. Xác nhận siêu dữ liệu phiên bản được đính kèm chuẩn xác trong kết quả trả về.
