import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryGlossaryStore } from '../../src/ai/agents/localization/index.ts';

test('LC04: Cô lập glossary theo tenant và phiên bản (Tenant & Version Isolation)', () => {
  const store = new InMemoryGlossaryStore();

  const entriesTenantA = [
    { sourceTerm: 'cà phê', targetTerm: 'กาแฟพรีเมียม', domain: 'beverage' },
  ];
  const entriesTenantB = [
    { sourceTerm: 'cà phê', targetTerm: 'กาแฟโบราณ', domain: 'beverage' },
  ];

  store.setGlossary('tenant_alpha', 'vi', 'th', 'v1', entriesTenantA);
  store.setGlossary('tenant_beta', 'vi', 'th', 'v1', entriesTenantB);

  const resA = store.getGlossary('tenant_alpha', 'vi', 'th', 'v1');
  const resB = store.getGlossary('tenant_beta', 'vi', 'th', 'v1');

  assert.equal(resA.length, 1);
  assert.equal(resB.length, 1);
  assert.equal(resA[0].targetTerm, 'กาแฟพรีเมียม');
  assert.equal(resB[0].targetTerm, 'กาแฟโบราณ');

  // Nâng cấp version tenant A lên v2 không ảnh hưởng v1 và tenant B
  const entriesTenantAv2 = [
    { sourceTerm: 'cà phê', targetTerm: 'กาแฟออร์แกนิก', domain: 'beverage' },
  ];
  store.setGlossary('tenant_alpha', 'vi', 'th', 'v2', entriesTenantAv2);

  const resAv1 = store.getGlossary('tenant_alpha', 'vi', 'th', 'v1');
  const resAv2 = store.getGlossary('tenant_alpha', 'vi', 'th', 'v2');
  const resBUnchanged = store.getGlossary('tenant_beta', 'vi', 'th', 'v1');

  assert.equal(resAv1[0].targetTerm, 'กาแฟพรีเมียม');
  assert.equal(resAv2[0].targetTerm, 'กาแฟออร์แกนิก');
  assert.equal(resBUnchanged[0].targetTerm, 'กาแฟโบราณ');
});

test('Glossary: Khớp thuật ngữ trong văn bản (findMatchingEntries)', () => {
  const store = new InMemoryGlossaryStore();
  const entries = [
    { sourceTerm: 'Robusta', targetTerm: 'โรบัสต้า', caseSensitive: true },
    { sourceTerm: 'đậm vị', targetTerm: 'รสชาติเข้มข้น', caseSensitive: false },
  ];

  const matched = store.findMatchingEntries('Cà phê hạt Robusta rang đậm vị chuẩn gu', entries);
  assert.equal(matched.length, 2);
  assert.equal(matched[0].targetTerm, 'โรบัสต้า');
  assert.equal(matched[1].targetTerm, 'รสชาติเข้มข้น');

  const caseMismatch = store.findMatchingEntries('hạt robusta rang mộc', entries);
  assert.equal(caseMismatch.length, 0);
});
