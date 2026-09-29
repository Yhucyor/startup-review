import type { ContentSnapshot, ProductFact } from './types.ts';

export function buildProductFacts(snapshot: ContentSnapshot): ProductFact[] {
  const facts: ProductFact[] = [];

  if (snapshot.title && snapshot.title.trim()) {
    facts.push({
      id: 'fact-title',
      fieldPath: 'title',
      value: snapshot.title.trim(),
    });
  }

  if (snapshot.brand && snapshot.brand.trim()) {
    facts.push({
      id: 'fact-brand',
      fieldPath: 'brand',
      value: snapshot.brand.trim(),
    });
  }

  if (Array.isArray(snapshot.materials)) {
    snapshot.materials.forEach((mat, idx) => {
      if (mat && mat.trim()) {
        facts.push({
          id: `fact-material-${idx}`,
          fieldPath: `materials[${idx}]`,
          value: mat.trim(),
        });
      }
    });
  }

  if (snapshot.specifications) {
    for (const [key, val] of Object.entries(snapshot.specifications)) {
      if (val && String(val).trim()) {
        const sanitizedKey = key.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        facts.push({
          id: `fact-spec-${sanitizedKey}`,
          fieldPath: `specifications.${key}`,
          value: String(val).trim(),
        });
      }
    }
  }

  if (snapshot.attributes) {
    for (const [key, val] of Object.entries(snapshot.attributes)) {
      if (val && String(val).trim()) {
        const sanitizedKey = key.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        facts.push({
          id: `fact-attr-${sanitizedKey}`,
          fieldPath: `attributes.${key}`,
          value: String(val).trim(),
        });
      }
    }
  }

  if (Array.isArray(snapshot.variants)) {
    snapshot.variants.forEach((variant) => {
      const sku = variant.sku || 'default';
      const sanitizedSku = sku.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      if (variant.name && variant.name.trim()) {
        facts.push({
          id: `fact-variant-${sanitizedSku}-name`,
          fieldPath: `variants.${sku}.name`,
          value: variant.name.trim(),
          variantSku: sku,
        });
      }

      if (typeof variant.price === 'number') {
        facts.push({
          id: `fact-variant-${sanitizedSku}-price`,
          fieldPath: `variants.${sku}.price`,
          value: `${variant.price} VND`,
          variantSku: sku,
        });
      }

      if (typeof variant.weightGrams === 'number' && variant.weightGrams > 0) {
        facts.push({
          id: `fact-variant-${sanitizedSku}-weight`,
          fieldPath: `variants.${sku}.weightGrams`,
          value: `${variant.weightGrams}g`,
          variantSku: sku,
        });
      }

      if (variant.attributes) {
        for (const [vKey, vVal] of Object.entries(variant.attributes)) {
          if (vVal && String(vVal).trim()) {
            const sanitizedKey = vKey.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            facts.push({
              id: `fact-variant-${sanitizedSku}-attr-${sanitizedKey}`,
              fieldPath: `variants.${sku}.attributes.${vKey}`,
              value: String(vVal).trim(),
              variantSku: sku,
            });
          }
        }
      }
    });
  }

  return facts;
}

export function createFactLookup(facts: ProductFact[]): Map<string, ProductFact> {
  const map = new Map<string, ProductFact>();
  for (const fact of facts) {
    map.set(fact.id, fact);
  }
  return map;
}
