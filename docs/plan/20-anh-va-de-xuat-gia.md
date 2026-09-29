# 20. Nhánh ảnh và đề xuất giá

## Phạm vi theo giai đoạn

Sơ đồ 4 README mô tả nhánh ảnh/giá nhưng mục (15) loại sinh ảnh và AI tự đổi giá khỏi MVP. Khối này giữ kế hoạch đầy đủ mà không tự mở các tính năng bị loại trừ.

| Nhánh | MVP phải có | Khi được mở rộng |
|---|---|---|
| Ảnh | Người dùng tải ảnh, kiểm tra định dạng/kích thước/số ảnh, giữ bản gốc, báo lỗi | Crop/resize có xem trước; sau đó mới tích hợp sinh ảnh/xóa nền theo phạm vi được chấp thuận |
| Giá | Giá nguyên tệ do người bán nhập, validation, version, duyệt thay đổi và đồng bộ | AI giải thích/đề xuất giá từ chi phí/dataset có nguồn; không tự áp dụng |

Phụ thuộc 01, 03, 08–11. Code `assets`, `pricing` và agent mở rộng `image-adaptation`, `pricing-suggestion` khi thực sự cần.

## A. Ảnh từ đầu tới cuối

Input: asset ID thuộc tenant, bản gốc/checksum, mục tiêu crop/size, ruleset sàn, sản phẩm/biến thể, thao tác người dùng đã yêu cầu. Output `assetVariantId`, source asset, transform/provider version, checksum, mime/size/dimensions, `generatedBy`, warnings, preview URL có hạn.

1. Upload vào storage theo tenant qua server hoặc signed upload giới hạn phạm vi; kiểm tra MIME thực, dung lượng, kích thước giải nén, tên file và quyền đọc. Không cho URL input truy cập mạng nội bộ.
2. Lưu asset gốc bất biến; kiểm tra metadata bằng code. Không cần model cho resize/đổi kích thước xác định; chọn thư viện đã có, xin phép trước dependency mới.
3. Với crop/resize, tạo biến thể mới và preview; kiểm tra không cắt thông tin bắt buộc như nhãn hàng. Nếu không chắc, người bán xác nhận.
4. Chỉ khi mở sinh ảnh: prompt không thêm chứng nhận/nhãn/thành phần; ghi nguồn và provider, budget/timeout/cancel. Kiểm tra tính trung thực của ảnh sản phẩm bằng người; ảnh sinh chưa được xác nhận không tự đăng.
5. Gắn asset mới vào proposal chung cùng text/giá/version. Thay asset sau duyệt làm hash thay đổi và phải duyệt lại. Không ghi đè file cũ đang được listing live dùng.

Test IMG01 file giả MIME; IMG02 ảnh quá lớn/URL nội bộ; IMG03 tenant B đọc signed URL A ngoài phạm vi; IMG04 resize giữ bản gốc; IMG05 provider timeout giữ ảnh cũ; IMG06 đổi ảnh làm stale approval. Hoàn thành MVP chỉ cần upload/validation; phần sinh ảnh được đánh dấu chưa triển khai cho tới khi có test/provider thật.

## B. Giá từ đầu tới cuối

Input: variant, current price/currency/version, cost components do seller nhập, phí có nguồn/thời điểm, target margin được xác nhận, dataset giá tham khảo có quyền nếu có. Output `suggestedPriceMinor`, currency, `calculation`, assumptions, sourceRefs, warnings. Model chỉ giải thích hoặc đề xuất giả thuyết; code tính số tiền.

1. Chốt định nghĩa margin: nếu margin trên doanh thu là m, phí tỷ lệ là f, cost cố định là C thì giá lý thuyết `C/(1-m-f)` với điều kiện `m+f<1`. Thuế/chi phí khác phải được định nghĩa rõ có nằm trong C/f hay chưa; không coi công thức này đúng cho mọi mô hình bán.
2. Dùng số nguyên/decimal có quy tắc làm tròn được duyệt; không chuyển currency nếu thiếu tỷ giá đã xác nhận. Thiếu cost/fee trả needs_input.
3. So sánh giới hạn giá/ngưỡng thay đổi tại 09. Giá gốc bằng 0 không tính phần trăm tùy tiện. Không lấy giá đối thủ do LLM bịa.
4. Tạo proposal loại `change_price`, hiển thị trước/sau, currency, assumptions, listing bị ảnh hưởng. Quyền approve là quyền sửa giá; autoPublish không là quyền tự đổi giá.
5. Sau duyệt, cập nhật giá nội bộ bằng expected version, tạo outbox đồng bộ; 11/12 cập nhật từng listing và giữ desired/confirmed riêng.

Test PR01 C=60000, m=0.2, f=0.1 → giá trước làm tròn = 600000/7; PR02 m+f≥1 bị từ chối; PR03 khác currency không tự quy đổi; PR04 thiếu phí không tạo giá chắc chắn; PR05 ORDER_MANAGER không duyệt giá; PR06 retry sync không cập nhật giá gốc lần hai.

## Hợp nhất với văn bản

Nếu nhánh text/ảnh/giá cùng được yêu cầu, chạy phần độc lập trên cùng snapshot, join theo phiên bản và tạo các proposal rõ tác động. UI có thể trình bày một gói nhưng phê duyệt phải chỉ rõ từng action; không dùng approval đăng bài để tự chấp thuận giá mới. Nếu cần phối hợp nhiều action không nguyên tử ngoài sàn, hiển thị kết quả từng action và phần thất bại, không hứa all-or-nothing.
