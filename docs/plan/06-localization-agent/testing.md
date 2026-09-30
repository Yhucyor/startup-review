# Ma trận Kiểm thử và Nghiệm thu Tác nhân bản địa hóa

Quay lại [Tổng quan kế hoạch](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/overview.md).

## Ma trận kiểm thử chuẩn hóa

| Mã ca | Mục tiêu kiểm thử | Đầu vào | Kết quả kỳ vọng | Pha triển khai |
|---|---|---|---|---|
| **LC01** | Bỏ qua LLM khi trùng ngôn ngữ và tone | `sourceLocale: 'vi-VN'`, `targetLocale: 'vi-VN'`, tone mặc định | Không gọi mô hình. Tái sử dụng nội dung gốc. Ghi nhận `status: 'skipped'`. | Pha 4 |
| **LC01b** | Gọi mô hình khi đổi tone cùng ngôn ngữ | `sourceLocale: 'vi-VN'`, `targetLocale: 'vi-VN'`, `tone: 'luxury'` | Khởi tạo cuộc gọi mô hình để viết lại văn phong phù hợp. | Pha 4 |
| **LC02** | Bắt lỗi ảo giác số lượng | Gốc ghi `250g`, bản dịch sinh `500g` | Validator báo lỗi sai lệch số liệu `valid: false`. Chặn xuất bản. | Pha 3 |
| **LC02b** | Bắt lỗi hoán đổi số giữa biến thể | Gốc `SKU A: 250g, SKU B: 500g`. Bản dịch `SKU A: 500g, SKU B: 250g` | Validator phát hiện hoán đổi biến thể và trả về `valid: false`. | Pha 3 |
| **LC03** | Chặn tự đổi tiền tệ | Gốc ghi giá VND, chuyển ngữ sang tiếng Thái | Bản dịch tuyệt đối không xuất hiện ký hiệu THB hoặc công thức tỷ giá. | Pha 3 |
| **LC04** | Cô lập glossary theo tenant | Cùng từ khóa nguồn nhưng Tenant A và B có nghĩa dịch khác nhau | Dịch và bộ nhớ đệm tách biệt hoàn toàn theo tenant và phiên bản trong bộ nhớ. | Pha 1 |
| **LC05** | Gắn cờ claim không nguồn xác thực | Bản dịch tự thêm cụm "đạt chuẩn nhập khẩu" | Phát hiện claim không có trong fact nguồn. Gắn cờ cảnh báo `needsReview: true`. | Pha 3 |
| **LC06** | Phục hồi nhánh thất bại | Node `localization` lỗi, node `content` thành công | `retryStep` chỉ chạy lại bản địa hóa và downstream. Không gọi lại `content`. | Pha 5 |
| **LC06b** | Dọn sạch proposal cũ khi retry | Đã có proposal cũ trong checkpointer, bước dịch retry gặp lỗi | Toàn bộ `proposalData` và `assembledData` cũ bị xóa sạch, không lưu vết rác. | Pha 5 |
| **LC07** | Đánh giá bộ mẫu song ngữ tự động | 10 mẫu tiếng Thái và 10 mẫu tiếng Anh | Tỷ lệ bảo toàn số liệu và thương hiệu đạt tuyệt đối 100%. | Pha 6 |
| **LC08** | Phòng thủ Prompt Injection | Chỉ dẫn người bán cố tình ghi đè Brand hoặc SKU | Bộ trích xuất phát hiện vi phạm và hủy kết quả dịch không an toàn. | Pha 6 |
| **LC09** | Chặn tự động duyệt tại node policy | Bản dịch có cờ `needsReview: true` hoặc locale `experimental` | Policy từ chối tự động duyệt, chuyển sang `waiting_approval` kèm cảnh báo. | Pha 5 |

## Các lệnh kiểm thử dự án

```bash
# 1. Kiểm tra toàn bộ kiểu dữ liệu
npm run typecheck

# 2. Kiểm tra quy chuẩn mã nguồn
npm run lint

# 3. Chạy toàn bộ kiểm thử đơn vị tác nhân bản địa hóa
node --test tests/ai/localization-*.test.mjs

# 4. Chạy kiểm thử tích hợp luồng điều phối
node --test tests/ai/prepare-listing.test.mjs

# 5. Chạy bộ kiểm thử hồi quy toàn dự án
npm test
```

## Tiêu chí bàn giao và ký duyệt (Definition of Done)

1. Toàn bộ 12 ca kiểm thử trong ma trận đều chạy qua (100% green).
2. Không có bất kỳ cảnh báo kiểu dữ liệu hoặc vi phạm lint nào.
3. Không xảy ra hiện tượng hoán đổi thông số giữa các biến thể sản phẩm.
4. Mọi trạng thái `needs_review` hoặc locale `experimental` đều chặn tự động duyệt bài đăng thành công.
5. Việc retry bước localization dọn dẹp sạch sẽ toàn bộ đề xuất cũ trong bộ nhớ.
6. Mã nguồn tuân thủ triệt để nguyên tắc không để lại chú thích tự thuật thừa thãi.
