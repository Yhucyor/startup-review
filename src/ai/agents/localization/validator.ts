import type { ProtectedFactsBundle } from './protected-tokens.ts';
import { normalizeNumber, normalizeUnit } from './protected-tokens.ts';
import type { ClaimMapping, ProductFactRef } from './types.ts';

export interface ValidationDiscrepancy {
  type: 'variant_swap' | 'numeric_mismatch' | 'unauthorized_currency' | 'unmapped_claim' | 'brand_missing';
  details: string;
  variantSku?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  needsReview: boolean;
  discrepancies: ValidationDiscrepancy[];
}

const FORBIDDEN_CURRENCY_PATTERNS = [
  /\bTHB\b/i,
  /฿/,
  /\bSGD\b/i,
  /S\$/,
  /\bMYR\b/i,
  /\bRM\b/i,
  /\bUSD\b/i,
  /(?<![a-zA-Z])\$(?!\w)/,
  /tỷ giá/i,
  /exchange rate/i,
  /อัตราแลกเปลี่ยน/i,
];

const STRONG_UNVERIFIED_TERMS = [
  /đạt chuẩn/i,
  /tiêu chuẩn quốc tế/i,
  /chứng nhận y tế/i,
  /trị dứt điểm/i,
  /chữa bệnh/i,
  /nhập khẩu chính ngạch 100%/i,
  /organic certified/i,
  /fda approved/i,
  /รับรองมาตรฐาน/i,
  /รักษาโรค/i,
];

export function validateLocalizedOutput(
  output: {
    title: string;
    description: string;
    highlights?: string[];
    claimMappings?: ClaimMapping[];
  },
  bundle: ProtectedFactsBundle,
  sourceFacts?: ProductFactRef[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const discrepancies: ValidationDiscrepancy[] = [];
  let needsReview = false;

  const fullText = [
    output.title,
    output.description,
    ...(output.highlights || []),
  ].join(' \n ');

  // 1. Kiểm tra tiền tệ ngoại lai (LC03)
  for (const pattern of FORBIDDEN_CURRENCY_PATTERNS) {
    if (pattern.test(fullText)) {
      const match = fullText.match(pattern)?.[0] || '';
      const msg = `Phát hiện tiền tệ hoặc tỷ giá trái phép không có trong bản gốc: "${match}"`;
      errors.push(msg);
      discrepancies.push({
        type: 'unauthorized_currency',
        details: msg,
      });
    }
  }

  // 2. Kiểm tra tên thương hiệu
  if (bundle.brand) {
    const brandLower = bundle.brand.toLowerCase();
    if (!fullText.toLowerCase().includes(brandLower)) {
      warnings.push(`Tên thương hiệu "${bundle.brand}" không xuất hiện trong bản dịch`);
      discrepancies.push({
        type: 'brand_missing',
        details: `Thương hiệu "${bundle.brand}" bị thiếu`,
      });
      needsReview = true;
    }
  }

  // 3. Kiểm tra hoán đổi số liệu biến thể (LC02b)
  const skuFacts = bundle.variantFacts.filter((f) => f.variantSku);
  if (skuFacts.length >= 2) {
    for (const fact of skuFacts) {
      const sku = fact.variantSku!;
      const skuRegex = new RegExp(escapeRegExp(sku), 'g');
      let match: RegExpExecArray | null;
      while ((match = skuRegex.exec(fullText)) !== null) {
        // Chỉ quét đoạn văn bản ngay sau SKU để tránh trùng lặp với số nằm trong chính mã SKU
        const afterSkuText = fullText.slice(match.index + sku.length, match.index + sku.length + 60);
        const numMatch = afterSkuText.match(/(?:comes in|weight|size|là|có|quy cách|pack|\s|:|-)*(\d+(?:[.,]\d+)?)\s*([a-zA-Z\p{L}]+)?/u);
        if (numMatch && numMatch[1]) {
          const foundNum = normalizeNumber(numMatch[1]);
          const foundUnit = numMatch[2] ? normalizeUnit(numMatch[2]) : '';

          if (foundNum !== null) {
            for (const otherFact of skuFacts) {
              if (
                otherFact.variantSku !== sku &&
                otherFact.normalizedNumber === foundNum &&
                (!foundUnit || !otherFact.normalizedUnit || foundUnit === otherFact.normalizedUnit) &&
                fact.normalizedNumber !== foundNum
              ) {
                const msg = `Hoán đổi số liệu: Biến thể SKU "${sku}" bị gán giá trị ${foundNum}${foundUnit || fact.normalizedUnit} thay vì ${fact.normalizedNumber}${fact.normalizedUnit}`;
                errors.push(msg);
                discrepancies.push({
                  type: 'variant_swap',
                  details: msg,
                  variantSku: sku,
                });
              }
            }
          }
        }
      }
    }
  }

  // 4. Kiểm tra sai lệch số lượng chung (LC02)
  // Nếu có fact nghiêm ngặt (ví dụ khối lượng 250g)
  for (const fact of bundle.variantFacts) {
    if (fact.isStrictInvariable) {
      // Tìm xem số chuẩn hóa có xuất hiện ở bất cứ đâu trong bản dịch không
      const numPattern = new RegExp(`(?<!\\d)${fact.normalizedNumber}(?!\\d)`);
      if (!numPattern.test(fullText)) {
        const msg = `Số liệu bắt buộc "${fact.rawValue}" (${fact.normalizedNumber}${fact.normalizedUnit}) không tìm thấy trong bản dịch`;
        errors.push(msg);
        discrepancies.push({
          type: 'numeric_mismatch',
          details: msg,
          variantSku: fact.variantSku,
        });
      }
    }
  }

  // 5. Kiểm tra Claim phóng đại / chưa xác thực (LC05)
  for (const pattern of STRONG_UNVERIFIED_TERMS) {
    if (pattern.test(fullText)) {
      const match = fullText.match(pattern)?.[0] || '';
      // Kiểm tra xem trong claimMappings có mapping nào trỏ tới sourceFactId hợp lệ không
      const hasValidMapping = output.claimMappings?.some(
        (cm) => cm.translatedSegment.toLowerCase().includes(match.toLowerCase()) && cm.sourceFactId
      );

      if (!hasValidMapping) {
        const msg = `Phát hiện tuyên bố chất lượng chưa có nguồn xác thực: "${match}"`;
        warnings.push(msg);
        discrepancies.push({
          type: 'unmapped_claim',
          details: msg,
        });
        needsReview = true;
      }
    }
  }

  // Kiểm tra tính toàn vẹn của claimMappings nếu có
  if (output.claimMappings && Array.isArray(output.claimMappings) && sourceFacts) {
    const validSourceIds = new Set(sourceFacts.map((sf) => sf.id));
    for (const cm of output.claimMappings) {
      if (cm.sourceFactId && !validSourceIds.has(cm.sourceFactId)) {
        warnings.push(`Claim mapping trỏ vào sourceFactId không tồn tại: "${cm.sourceFactId}"`);
        needsReview = true;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    needsReview,
    discrepancies,
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
