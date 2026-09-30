# Pha 2: Bộ trích xuất Thông số biến thể và Chuẩn hóa đơn vị

Quay lại [Tổng quan kế hoạch](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/overview.md).

## Mục tiêu

Xây dựng bộ trích xuất thông số kỹ thuật gắn liền với ngữ cảnh biến thể theo nguyên tắc **Boundary Discipline**.
Ngăn chặn hoàn toàn việc hoán đổi số liệu giữa các biến thể hoặc SKU khác nhau.
Chuẩn hóa biểu diễn số liệu, quy cách kích thước và từ đồng nghĩa của đơn vị đo lường bằng code thuần.

## Các tệp thay đổi

1. `src/ai/agents/localization/protected-tokens.ts`.
Tệp này trích xuất danh sách token bảo vệ từ `ProductSnapshot` và `productFacts`.
Tệp này gắn chặt mỗi giá trị số với SKU biến thể hoặc khóa thuộc tính tương ứng.
Tệp này áp dụng các quy tắc chuẩn hóa số học và đơn vị đo lường.

2. `src/ai/agents/localization/index.ts`.
Tệp này xuất hàm `extractVariantFacts` và hàm `normalizeMetricValue`.

3. `tests/ai/localization-tokens.test.mjs`.
Tệp kiểm thử khả năng trích xuất chính xác thông số biến thể và chuẩn hóa chuỗi số phức tạp.

## Quy tắc chuẩn hóa (Normalization Rules)

1. **Dấu thập phân.**
Chuẩn hóa dấu phẩy (`,`) và dấu chấm (`.`) về dạng số thực tiêu chuẩn (`2.5kg` và `2,5kg` đều hiểu là `2.5`).

2. **Khoảng trắng và ký tự ngăn cách.**
Loại bỏ khoảng trắng dư thừa giữa số và đơn vị đo (`500 g` tương đương `500g`).

3. **Quy cách kích thước.**
Chuẩn hóa dấu nhân (`x`, `X`, `*`, `×`) và khoảng trắng xung quanh (`10x15cm`, `10 x 15 cm`, `10*15cm` đều chuẩn hóa về `10x15 cm`).

4. **Từ đồng nghĩa của đơn vị đo (Unit Synonyms).**
Xây dựng từ điển ánh xạ đơn vị sang mã chuẩn:
- Khối lượng: `g`, `gr`, `gam`, `gram`, `grams` quy về `g`. `kg`, `kilo`, `kilogram` quy về `kg`.
- Thể tích: `ml`, `mililit` quy về `ml`. `l`, `lit`, `liter` quy về `l`.
- Chiều dài: `mm`, `cm`, `m`, `inch`.

## Cấu trúc dữ liệu chính

```typescript
export interface VariantNumericFact {
  id: string;
  variantSku?: string;
  attributeKey?: string;
  rawValue: string;
  normalizedNumber: number;
  normalizedUnit: string;
  isStrictInvariable: boolean;
}

export interface ProtectedFactsBundle {
  brand?: string;
  skus: string[];
  variantFacts: VariantNumericFact[];
  rawLockedTokens: string[];
}
```

## Xác minh và nghiệm thu

**Kiểm tra tĩnh.**
Chạy `npm run typecheck` đạt kết quả sạch.

**Kiểm tra động.**
1. Khởi tạo snapshot gồm hai biến thể: SKU `CF-250` có khối lượng `250 gam`, SKU `CF-500` có khối lượng `500 gam`.
2. Xác nhận hàm trích xuất tạo ra hai `VariantNumericFact` riêng biệt gắn đúng SKU.
3. Xác nhận chuỗi kích thước `10 x 15 x 20 cm` và `10x15x20cm` đều cho ra cùng kết quả chuẩn hóa.
4. Trường hợp chuỗi số mơ hồ không thể phân tích chắc chắn, hàm ghi nhận cảnh báo và gắn cờ `requiresReview`.
