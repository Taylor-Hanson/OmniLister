import { toCents, fromCents } from './money';

// COGS calculation helpers
export function lockedCogsCents(purchasePriceCents: number, extraCostsCents: number[]): number {
  const base = purchasePriceCents ?? 0;
  const extras = extraCostsCents.reduce((sum, cost) => sum + (cost ?? 0), 0);
  return base + extras;
}

export function grossProfitCents(
  salePriceCents: number,
  shippingChargedCents: number,
  cogsCents: number,
  shippingCostCents: number,
  platformFeesCents: number,
  discountsCents: number,
  refundsCents: number,
  chargebacksCents: number
): number {
  const revenue = (salePriceCents ?? 0) + (shippingChargedCents ?? 0);
  const costs = (cogsCents ?? 0) + 
                (shippingCostCents ?? 0) + 
                (platformFeesCents ?? 0) + 
                (discountsCents ?? 0) + 
                (refundsCents ?? 0) + 
                (chargebacksCents ?? 0);
  
  return revenue - costs;
}

export function netProfitCents(grossProfitCents: number, expensesCents: number): number {
  return grossProfitCents - (expensesCents ?? 0);
}

// FIFO inventory valuation (for future use)
export function calculateFifoValuation(items: Array<{
  id: string;
  purchasePriceCents: number;
  quantity: number;
  acquiredAt: number;
}>): number {
  // Sort by acquisition date (FIFO)
  const sorted = items.sort((a, b) => a.acquiredAt - b.acquiredAt);
  
  return sorted.reduce((total, item) => {
    return total + (item.purchasePriceCents * item.quantity);
  }, 0);
}

// Average cost valuation (for future use)
export function calculateAverageCostValuation(items: Array<{
  purchasePriceCents: number;
  quantity: number;
}>): number {
  const totalCost = items.reduce((sum, item) => sum + (item.purchasePriceCents * item.quantity), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  
  if (totalQuantity === 0) return 0;
  
  const avgCost = totalCost / totalQuantity;
  return avgCost * totalQuantity;
}
