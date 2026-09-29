import { BudgetExceededError } from './types.ts';

export interface TenantBudgetRecord {
  limitUsd: number;
  reservedUsd: number;
  spentUsd: number;
}

export class BudgetLedger {
  private budgets = new Map<string, TenantBudgetRecord>();

  public setTenantLimit(tenantId: string, limitUsd: number): void {
    const existing = this.budgets.get(tenantId);
    if (existing) {
      existing.limitUsd = limitUsd;
    } else {
      this.budgets.set(tenantId, { limitUsd, reservedUsd: 0, spentUsd: 0 });
    }
  }

  public getBalance(tenantId: string): TenantBudgetRecord {
    const record = this.budgets.get(tenantId);
    if (!record) {
      return { limitUsd: 10.0, reservedUsd: 0, spentUsd: 0 };
    }
    return { ...record };
  }

  public reserve(tenantId: string, amountUsd: number): boolean {
    const record = this.budgets.get(tenantId) || { limitUsd: 10.0, reservedUsd: 0, spentUsd: 0 };
    const available = record.limitUsd - (record.spentUsd + record.reservedUsd);

    if (amountUsd > available) {
      return false;
    }

    record.reservedUsd += amountUsd;
    this.budgets.set(tenantId, record);
    return true;
  }

  public commit(tenantId: string, reservedAmountUsd: number, actualSpentUsd: number): void {
    const record = this.budgets.get(tenantId);
    if (!record) return;

    record.reservedUsd = Math.max(0, record.reservedUsd - reservedAmountUsd);
    record.spentUsd += actualSpentUsd;
    this.budgets.set(tenantId, record);
  }

  public release(tenantId: string, reservedAmountUsd: number): void {
    const record = this.budgets.get(tenantId);
    if (!record) return;

    record.reservedUsd = Math.max(0, record.reservedUsd - reservedAmountUsd);
    this.budgets.set(tenantId, record);
  }

  public requireReservation(tenantId: string, amountUsd: number): void {
    const ok = this.reserve(tenantId, amountUsd);
    if (!ok) {
      throw new BudgetExceededError(
        `Budget limit exceeded for tenant ${tenantId}. Requested reservation: $${amountUsd.toFixed(4)}`
      );
    }
  }
}
