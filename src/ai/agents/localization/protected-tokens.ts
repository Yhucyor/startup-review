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

const UNIT_SYNONYMS: Record<string, string> = {
  g: 'g',
  gr: 'g',
  gam: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilo: 'kg',
  kilogram: 'kg',
  ml: 'ml',
  mililit: 'ml',
  l: 'l',
  lit: 'l',
  liter: 'l',
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  inch: 'inch',
  inches: 'inch',
};

export function normalizeUnit(rawUnit: string): string {
  const clean = rawUnit.trim().toLowerCase();
  return UNIT_SYNONYMS[clean] || clean;
}

export function normalizeNumber(rawStr: string): number | null {
  if (!rawStr) return null;
  // Thay thế dấu phẩy thập phân nếu không có dấu chấm khác
  let clean = rawStr.trim();
  // Nếu có dạng "1,5" -> "1.5", nhưng nếu có "1,000.5" -> "1000.5"
  if (/^\d+,\d+$/.test(clean)) {
    clean = clean.replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(clean)) {
    clean = clean.replace(/,/g, '');
  }
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

export function normalizeDimensions(rawStr: string): string {
  if (!rawStr) return '';
  // Chuẩn hóa 10x15cm, 10 x 15 cm, 10*15cm, 10×15cm
  return rawStr
    .replace(/\s*([xX*×])\s*/g, 'x')
    .replace(/(?<=\d)\s*([a-zA-Z\p{L}]+)$/u, ' $1')
    .trim();
}

export function parseNumberWithUnit(str: string): { num: number; unit: string } | null {
  const match = str.trim().match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z\p{L}]+)$/u);
  if (!match) return null;
  const num = normalizeNumber(match[1]);
  if (num === null) return null;
  const unit = normalizeUnit(match[2]);
  return { num, unit };
}

export function extractVariantFacts(
  snapshot: {
    id: string;
    title: string;
    brand?: string;
    attributes?: Record<string, string>;
    variants?: Array<{
      sku: string;
      name?: string;
      weightGrams?: number;
      price?: number;
      attributes?: Record<string, string>;
    }>;
  },
  externalFacts?: Array<{ id: string; fieldPath: string; value: string; variantSku?: string }>
): ProtectedFactsBundle {
  const skus: string[] = [];
  const variantFacts: VariantNumericFact[] = [];
  const rawLockedTokens: string[] = [];

  if (snapshot.brand) {
    rawLockedTokens.push(snapshot.brand);
  }

  // 1. Quét biến thể
  if (snapshot.variants && Array.isArray(snapshot.variants)) {
    for (const v of snapshot.variants) {
      if (v.sku) {
        skus.push(v.sku);
        rawLockedTokens.push(v.sku);
      }
      if (v.weightGrams !== undefined && v.weightGrams !== null) {
        variantFacts.push({
          id: `fact_sku_${v.sku}_weight`,
          variantSku: v.sku,
          attributeKey: 'weight',
          rawValue: `${v.weightGrams}g`,
          normalizedNumber: v.weightGrams,
          normalizedUnit: 'g',
          isStrictInvariable: true,
        });
      }
      if (v.attributes) {
        for (const [key, val] of Object.entries(v.attributes)) {
          const parsed = parseNumberWithUnit(val);
          if (parsed) {
            variantFacts.push({
              id: `fact_sku_${v.sku}_${key}`,
              variantSku: v.sku,
              attributeKey: key,
              rawValue: val,
              normalizedNumber: parsed.num,
              normalizedUnit: parsed.unit,
              isStrictInvariable: true,
            });
          }
        }
      }
    }
  }

  // 2. Quét attributes chung
  if (snapshot.attributes) {
    for (const [key, val] of Object.entries(snapshot.attributes)) {
      if (key.toLowerCase() === 'brand') {
        if (!snapshot.brand) rawLockedTokens.push(val);
        continue;
      }
      if (key.toLowerCase() === 'sku' || key.toLowerCase() === 'model') {
        skus.push(val);
        rawLockedTokens.push(val);
        continue;
      }
      const parsed = parseNumberWithUnit(val);
      if (parsed) {
        variantFacts.push({
          id: `fact_attr_${key}`,
          attributeKey: key,
          rawValue: val,
          normalizedNumber: parsed.num,
          normalizedUnit: parsed.unit,
          isStrictInvariable: true,
        });
      }
    }
  }

  // 3. Quét tiêu đề và external facts nếu có
  if (externalFacts && Array.isArray(externalFacts)) {
    for (const ef of externalFacts) {
      const parsed = parseNumberWithUnit(ef.value);
      if (parsed) {
        // Tránh trùng lặp id
        if (!variantFacts.some((vf) => vf.id === ef.id)) {
          variantFacts.push({
            id: ef.id,
            variantSku: ef.variantSku,
            attributeKey: ef.fieldPath,
            rawValue: ef.value,
            normalizedNumber: parsed.num,
            normalizedUnit: parsed.unit,
            isStrictInvariable: true,
          });
        }
      }
    }
  }

  return {
    brand: snapshot.brand || snapshot.attributes?.brand,
    skus: [...new Set(skus)],
    variantFacts,
    rawLockedTokens: [...new Set(rawLockedTokens)],
  };
}
