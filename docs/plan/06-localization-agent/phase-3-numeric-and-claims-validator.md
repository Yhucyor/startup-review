# Pha 3: Bộ đối soát Thông số biến thể và Thẩm định Claim tham chiếu

Quay lại [Tổng quan kế hoạch](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/overview.md).

## Mục tiêu

Xây dựng bộ kiểm định đầu ra của bản dịch bằng logic thuần theo nguyên tắc **Boundary Discipline**.
Đối soát số liệu theo từng biến thể để ngăn chặn hiện tượng hoán đổi giá trị giữa các SKU.
Kiểm tra tính hợp lệ về mặt cấu trúc của các tham chiếu claim.
Chuyển tiếp các trường hợp nghi vấn hoặc chưa thể khẳng định chắc chắn về ngữ nghĩa sang Khối 08 với trạng thái `needs_review`.

## Các tệp thay đổi

1. `src/ai/agents/localization/validator.ts`.
Tệp này đối soát quan hệ giữa biến thể, giá trị số và đơn vị đo đã chuẩn hóa.
Tệp này quét và ngăn chặn tuyệt đối các ký hiệu tiền tệ mới hoặc tỷ giá quy đổi.
Tệp này kiểm tra tính toàn vẹn của liên kết `claimMappings` với danh mục facts nguồn.
Tệp này đánh dấu `needsReview: true` khi câu dịch có cấu trúc phức tạp hoặc độ tin cậy tham chiếu thấp.

2. `src/ai/agents/localization/index.ts`.
Tệp này xuất hàm `validateLocalizedOutput`.

3. `tests/ai/localization-validator.test.mjs`.
Tệp kiểm thử các ca hoán đổi biến thể, sai lệch số lượng, vi phạm tiền tệ và claim không nguồn.

## Cơ chế đối soát số liệu theo biến thể (Variant-level Parity Check)

1. **Khắc phục lỗi hoán đổi số.**
Không so sánh hai tập số rời rạc.
Hàm tìm kiếm ngữ cảnh xuất hiện của từng mã SKU hoặc tên biến thể trong bản dịch.
Hàm trích xuất số lượng đi liền với biến thể đó và so sánh với giá trị trong `VariantNumericFact`.
Nếu biến thể A bị gán giá trị của biến thể B, hàm lập tức báo lỗi `valid: false`.

2. **Xử lý số liệu không gắn SKU.**
Với các số liệu chung của sản phẩm (ví dụ dung tích tổng, thời gian bảo hành), hàm kiểm tra số lượng xuất hiện trong văn bản.
Nếu số lượng bị sai lệch (ví dụ 250g thành 500g), hàm báo lỗi `valid: false` (LC02).
Nếu phát hiện số lạ không rõ nguồn gốc và không thể khẳng định chắc chắn, hàm đánh dấu `needsReview: true`.

3. **Chặn quy đổi tiền tệ (LC03).**
Quét sự xuất hiện của các mã tiền tệ (`THB`, `SGD`, `MYR`, `USD`) hoặc ký hiệu (`฿`, `$`, `S$`) không có trong bản gốc.
Nếu bản gốc giá VND mà bản dịch xuất hiện ký hiệu THB hoặc công thức tỷ giá, hàm lập tức đánh dấu lỗi `valid: false`.

## Cơ chế thẩm định Claim tham chiếu (Claim Mapping Verification)

1. **Ranh giới trách nhiệm.**
Code thuần kiểm tra tính toàn vẹn cấu trúc của tham chiếu, không cố gắng phân tích ngữ nghĩa sâu của tiếng nước ngoài.
Khâu đánh giá độ chính xác về mặt ngữ nghĩa giữa câu dịch và fact nguồn được chuyển giao cho Khối 08 và người duyệt.

2. **Kiểm tra tham chiếu bằng code.**
Mỗi đoạn trong `claimMappings` phải trỏ tới một `sourceFactId` tồn tại trong `productFacts`.
Nếu một đoạn dịch chứa các từ khóa khẳng định mạnh (ví dụ "đạt chuẩn", "chứng nhận", "nhập khẩu") mà không có `sourceFactId` tương ứng, hàm đánh dấu `needsReview: true` (LC05).
Không đưa ra cam kết độ tin cậy tuyệt đối bằng code thuần. Toàn bộ trường hợp phân tích dưới ngưỡng chắc chắn đều phải được gắn cờ review.

## Cấu trúc dữ liệu chính

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  needsReview: boolean;
  discrepancies: Array<{
    type: 'variant_swap' | 'numeric_mismatch' | 'unauthorized_currency' | 'unmapped_claim';
    details: string;
    variantSku?: string;
  }>;
}
```

## Xác minh và nghiệm thu

**Kiểm tra tĩnh.**
Chạy `npm run typecheck` đạt kết quả sạch.

**Kiểm tra động.**
1. Test hoán đổi biến thể. Bản gốc có `SKU A: 250g, SKU B: 500g`. Bản dịch ghi `SKU A: 500g, SKU B: 250g`. Validator bắt đúng lỗi hoán đổi và trả về `valid: false`.
2. Test LC02. Bản gốc ghi `250g`, bản dịch ghi `500g`. Validator trả về `valid: false` và gắn cờ sai lệch số lượng.
3. Test LC03. Bản gốc ghi VND, bản dịch tiếng Thái chứa ký hiệu `฿`. Validator trả về `valid: false` do vi phạm quy định tiền tệ.
4. Test LC05. Bản dịch xuất hiện câu tự phong danh hiệu không có `sourceFactId`. Validator trả về `valid: true` kèm `needsReview: true` và cảnh báo claim chưa xác thực.
