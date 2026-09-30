import type { GlossaryEntry } from './types.ts';

export class InMemoryGlossaryStore {
  private store: Map<string, GlossaryEntry[]> = new Map();
  private latestVersions: Map<string, string> = new Map();

  private makeKey(tenantId: string, sourceLocale: string, targetLocale: string, version: string): string {
    return `${tenantId}:${sourceLocale.toLowerCase()}:${targetLocale.toLowerCase()}:${version}`;
  }

  private makePairKey(tenantId: string, sourceLocale: string, targetLocale: string): string {
    return `${tenantId}:${sourceLocale.toLowerCase()}:${targetLocale.toLowerCase()}`;
  }

  public setGlossary(
    tenantId: string,
    sourceLocale: string,
    targetLocale: string,
    version: string,
    entries: GlossaryEntry[]
  ): void {
    const key = this.makeKey(tenantId, sourceLocale, targetLocale, version);
    this.store.set(key, [...entries]);
    this.latestVersions.set(this.makePairKey(tenantId, sourceLocale, targetLocale), version);
  }

  public getGlossary(
    tenantId: string,
    sourceLocale: string,
    targetLocale: string,
    version?: string
  ): GlossaryEntry[] {
    const resolvedVersion =
      version || this.latestVersions.get(this.makePairKey(tenantId, sourceLocale, targetLocale)) || 'v1';
    const key = this.makeKey(tenantId, sourceLocale, targetLocale, resolvedVersion);
    return this.store.get(key) || [];
  }

  public getLatestVersion(tenantId: string, sourceLocale: string, targetLocale: string): string | undefined {
    return this.latestVersions.get(this.makePairKey(tenantId, sourceLocale, targetLocale));
  }

  public findMatchingEntries(text: string, entries: GlossaryEntry[]): GlossaryEntry[] {
    const matched: GlossaryEntry[] = [];
    for (const entry of entries) {
      const flags = entry.caseSensitive ? 'gu' : 'giu';
      const pattern = `(?<![\\p{L}\\p{N}])${escapeRegExp(entry.sourceTerm)}(?![\\p{L}\\p{N}])`;
      const regex = new RegExp(pattern, flags);
      if (regex.test(text)) {
        matched.push(entry);
      }
    }
    return matched;
  }

  public clear(): void {
    this.store.clear();
    this.latestVersions.clear();
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const defaultGlossaryStore = new InMemoryGlossaryStore();
