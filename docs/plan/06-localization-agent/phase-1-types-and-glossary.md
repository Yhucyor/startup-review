# Pha 1: Hợp đồng dữ liệu và Quản lý Glossary

Quay lại [Tổng quan kế hoạch](file:///home/dell/Documents/projects/startup-project/docs/plan/06-localization-agent/overview.md).

## Mục tiêu

Xây dựng nền tảng kiểu dữ liệu cốt lõi cho tác nhân bản địa hóa theo nguyên tắc **Foundational Thinking**.
Mở rộng trực tiếp các kiểu dữ liệu hiện có trong workflow và content agent thay vì tạo wrapper thừa.
Xây dựng cơ chế lưu trữ và tra cứu thuật ngữ (Glossary) trong bộ nhớ tách biệt theo tenant và phiên bản.

## Các tệp thay đổi

1. `src/ai/agents/localization/types.ts`.
Tệp này định nghĩa toàn bộ hợp đồng dữ liệu đầu vào và đầu ra của tác nhân bản địa hóa.
Tệp này khai báo cấu trúc bảng thuật ngữ và liên kết nguồn gốc claim.
Tệp này định nghĩa trạng thái xử lý chặt chẽ gồm `'translated' | 'skipped' | 'needs_review' | 'failed'`.

2. `src/ai/workflows/prepare-listing/types.ts`.
Tệp này mở rộng trực tiếp `LocalizationArtifact` để chứa các trường: `title`, `description`, `highlights`, `locale`, `status`, `claimMappings`, `warnings`, `needsReview`, `experimental`, `glossaryVersion`.
Tệp này mở rộng `ContentArtifact` để hỗ trợ lưu giữ `highlights`, `claims` và `contentHash` từ Content Agent.

3. `src/ai/agents/localization/glossary.ts`.
Tệp này quản lý việc tra cứu từ khóa theo cặp ngôn ngữ nguồn và đích trong bộ nhớ.
Tệp này cung cấp hàm lấy phiên bản glossary để gắn vào cache key.

4. `src/ai/agents/localization/index.ts`.
Tệp này xuất các kiểu dữ liệu và hàm tiện ích của module.

5. `tests/ai/localization-glossary.test.mjs`.
Tệp kiểm thử tính độc lập của glossary giữa các tenant và phát hiện xung đột phiên bản.

## Cấu trúc dữ liệu chính

```typescript
export type LocalizationStatus = 'translated' | 'skipped' | 'needs_review' | 'failed';

export interface ClaimMapping {
  translatedSegment: string;
  sourceFactId?: string;
  sourceClaimText?: string;
  confidence: 'verified_exact' | 'inferred' | 'unmapped';
}

export interface LocalizationInput {
  sourceTitle: string;
  sourceDescription: string;
  sourceHighlights?: string[];
  sourceClaims?: Array<{ id?: string; text: string; sourceRefs: string[] }>;
  sourceContentHash: string;
  sourceLocale: string;
  targetLocale: string;
  tone?: string;
  tenantId: string;
  glossaryVersion?: string;
  productFacts: Array<{ id: string; fieldPath: string; value: string; variantSku?: string }>;
  isExperimentalLocale?: boolean;
}

export interface LocalizationOutput {
  title: string;
  description: string;
  highlights: string[];
  locale: string;
  status: LocalizationStatus;
  claimMappings: ClaimMapping[];
  untranslatedTerms: string[];
  warnings: string[];
  needsReview: boolean;
  experimental: boolean;
  sourceContentHash: string;
  glossaryVersion?: string;
}

export interface GlossaryEntry {
  sourceTerm: string;
  targetTerm: string;
  domain?: string;
  caseSensitive?: boolean;
}
```

## Xác minh và nghiệm thu

**Kiểm tra tĩnh.**
Chạy `npm run typecheck` đảm bảo không có lỗi kiểu dữ liệu và không làm gãy các module hiện có.

**Kiểm tra động (Test LC04).**
Khởi tạo hai bảng glossary cho Tenant A phiên bản 1 và Tenant B phiên bản 1 với cùng từ khóa nguồn trong bộ nhớ.
Xác nhận tra cứu cho Tenant A trả về đúng thuật ngữ của Tenant A.
Xác nhận khi nâng phiên bản của Tenant A lên phiên bản 2, mã băm đầu vào thay đổi và không làm ảnh hưởng Tenant B.
Xác nhận các kiểu mở rộng trên `LocalizationArtifact` tương thích hoàn toàn với các kiểm thử sẵn có trong `tests/ai/prepare-listing.test.mjs`.
