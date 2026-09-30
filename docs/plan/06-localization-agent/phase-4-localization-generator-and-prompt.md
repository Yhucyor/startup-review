# Pha 4: Đường truyền Workflow, Prompt và Bộ sinh nội dung

Quay lại [Tổng quan kế hoạch](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/overview.md).

## Mục tiêu

Xây dựng đường truyền dữ liệu xuyên suốt từ workflow đến tác nhân bản địa hóa theo nguyên tắc **Boundary Discipline**.
Cung cấp đầy đủ tiêu đề, mô tả, danh sách điểm nổi bật (highlights), claims nguồn, facts và tone cho prompt.
Triển khai cơ chế Pure Skip có điều kiện dựa trên nguyên tắc **Laziness Protocol**.
Thiết lập công thức tính mã băm cache chống xung đột dữ liệu cũ khi nội dung nguồn được viết lại.

## Các tệp thay đổi

1. `src/ai/agents/localization/prompt.ts`.
Tệp này chứa system prompt định hướng phong cách bản địa hóa sàn thương mại điện tử.
Tệp này hướng dẫn mô hình tạo `claimMappings` liên kết từng câu dịch với mã `sourceFactId`.
Tệp này định nghĩa hằng số `LOCALIZATION_PROMPT_VERSION = '1.0.0'`.

2. `src/ai/agents/localization/generator.ts`.
Tệp này triển khai hàm chính `localizeContent`.
Tệp này kiểm tra điều kiện Pure Skip: chỉ bỏ qua khi cùng locale VÀ không thay đổi tone.
Tệp này tính mã băm `inputHash` tổng hợp từ `sourceContentHash`, `sourceLocale`, `targetLocale`, `tone` và `glossaryVersion`.
Tệp này gọi mô hình thông qua `ModelCallGateway.callStructuredModel` với `RuntimeContext`.
Tệp này đưa kết quả thô qua bộ validator từ Pha 3 trước khi trả về.

3. `src/ai/agents/localization/index.ts`.
Tệp này xuất hàm `localizeContent` và các hằng số liên quan.

4. `tests/ai/localization-generator.test.mjs`.
Tệp kiểm thử luồng sinh nội dung, tính toán cache hash và kiểm thử điều kiện Pure Skip.

## Đường truyền dữ liệu (Data Bridge Pipeline)

Để khắc phục việc thiếu thông tin trong `ContentArtifact` hiện tại:
1. Workflow `PrepareListingOrchestrator` lưu trữ đầy đủ `ContentOutput` vào `artifacts.contentData` (gồm `title`, `description`, `highlights`, `claims`, `contentHash`).
2. Node localization tiếp nhận đồng thời `ProductSnapshot` và `artifacts.contentData`.
3. Tác nhân trích xuất `productFacts` từ snapshot và đối chiếu trực tiếp với claims nguồn.
4. Thông tin truyền vào `ModelCallRequest.userPayload` bao gồm:
   - `sourceTitle`, `sourceDescription`, `sourceHighlights`.
   - `sourceClaims`: Danh sách các câu khẳng định gốc kèm nguồn tham chiếu.
   - `variantFacts`: Danh sách thông số gắn liền với từng SKU biến thể từ Pha 2.
   - `brand`, `skus`, `lockedTokens`.
   - `glossaryHints`: Thuật ngữ tương ứng lấy từ `TenantGlossaryStore`.
   - `tone`: Phong cách mong muốn (mặc định lấy theo brand voice của snapshot).

## Công thức tính mã băm Cache (Deterministic Cache Key)

Mã băm `inputHash` được tính toán bằng thuật toán SHA-256 từ chuỗi JSON chuẩn hóa:
```typescript
const rawInput = JSON.stringify({
  sourceContentHash: input.sourceContentHash, // Đảm bảo nội dung nguồn viết lại sẽ đổi cache
  sourceLocale: input.sourceLocale.toLowerCase(),
  targetLocale: input.targetLocale.toLowerCase(),
  tone: input.tone || 'standard',
  glossaryVersion: input.glossaryVersion || 'default_v1',
  variantFactsCount: input.productFacts.length,
});
const inputHash = createHash('sha256').update(rawInput).digest('hex');
```

## Điều kiện Pure Skip có điều kiện

```typescript
const isSameLocale = input.sourceLocale.toLowerCase() === input.targetLocale.toLowerCase();
const isToneUnchanged = !input.tone || input.tone === 'standard';

if (isSameLocale && isToneUnchanged) {
  return {
    title: input.sourceTitle,
    description: input.sourceDescription,
    highlights: input.sourceHighlights || [],
    locale: input.targetLocale,
    status: 'skipped',
    claimMappings: [],
    untranslatedTerms: [],
    warnings: ['Bỏ qua bước gọi LLM do cùng ngôn ngữ và không yêu cầu đổi giọng văn'],
    needsReview: false,
    experimental: false,
    sourceContentHash: input.sourceContentHash,
  };
}
```

## Xác minh và nghiệm thu

**Kiểm tra tĩnh.**
Chạy `npm run typecheck` đạt kết quả sạch.

**Kiểm tra động.**
1. Test LC01. Cùng ngôn ngữ `vi-VN` và tone mặc định. Hàm lập tức trả về `status: 'skipped'` mà không gọi mô hình.
2. Test LC01b. Cùng ngôn ngữ `vi-VN` nhưng người dùng yêu cầu đổi `tone: 'luxury'`. Hàm vẫn khởi tạo cuộc gọi mô hình để viết lại văn phong phù hợp.
3. Kiểm thử nội dung nguồn thay đổi. Giữ nguyên snapshot nhưng thay đổi `sourceContentHash`. Hàm tạo ra `inputHash` mới và không trả về bản dịch cũ từ bộ nhớ đệm.
