import Decimal from 'decimal.js';

// Precise money math using Decimal.js to avoid floating point errors
export const toCents = (n: number | string): number => {
  return Math.round(new Decimal(n).mul(100).toNumber());
};

export const fromCents = (c: number): number => {
  return new Decimal(c).div(100).toNumber();
};

export const formatMoney = (cents: number, currency = 'USD'): string => {
  const amount = fromCents(cents);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const parseMoney = (str: string): number => {
  // Remove currency symbols and parse
  const cleaned = str.replace(/[^0-9.-]/g, '');
  return toCents(cleaned);
};

// Money arithmetic helpers
export const addCents = (a: number, b: number): number => {
  return new Decimal(a).add(b).toNumber();
};

export const subtractCents = (a: number, b: number): number => {
  return new Decimal(a).sub(b).toNumber();
};

export const multiplyCents = (a: number, b: number): number => {
  return new Decimal(a).mul(b).toNumber();
};

export const divideCents = (a: number, b: number): number => {
  if (b === 0) return 0;
  return new Decimal(a).div(b).toNumber();
};
