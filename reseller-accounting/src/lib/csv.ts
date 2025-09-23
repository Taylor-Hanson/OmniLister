import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { z } from 'zod';
import { parse as parseDate, isValid } from 'date-fns';
import { toCents } from '../utils/money';
import { SalesCsvRowSchema, ExpensesCsvRowSchema } from '../utils/validation';

const moneyToCents = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^0-9.-]/g, ''));
  return toCents(n);
};

const parseMaybeDate = (s: string) => {
  const tryFormats = ['yyyy-MM-dd', 'M/d/yyyy', 'MM/dd/yyyy', 'yyyy/MM/dd', 'dd-MMM-yyyy'];
  for (const f of tryFormats) {
    const d = parseDate(s, f, new Date());
    if (isValid(d)) return d.getTime();
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return t;
  throw new Error(`Unrecognized date: ${s}`);
};

const sha256 = (s: string) => {
  // Simple hash for React Native (in production, use a proper crypto library)
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return String(h);
};

export type ParsedSale = {
  marketplace: string;
  marketplaceOrderId?: string | null;
  soldAt: number;
  salePriceCents: number;
  shippingChargedCents: number;
  shippingCostCents: number;
  platformFeesCents: number;
  discountsCents: number;
  refundsCents: number;
  chargebacksCents: number;
  taxCollectedCents: number;
  taxRemittedByMarketplace: boolean;
  currency: string;
  buyerState?: string | null;
  itemId?: string | null;
  rawPayload?: any;
  rowHash: string;
};

export type ParsedExpense = {
  occurredAt: number;
  amountCents: number;
  category: string;
  vendor?: string | null;
  method?: string | null;
  note?: string | null;
  mileageMiles?: number | null;
  vehicleRate?: number | null;
  rowHash: string;
};

type PapaResult = { data: any[]; errors: any[] };

async function parseCsvFile(uri: string): Promise<PapaResult> {
  const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (res) => resolve({ data: res.data as any[], errors: res.errors })
    });
  });
}

// Public API
export async function parseSalesCsv(uri: string, sourceLabel = 'unknown'): Promise<{ rows: ParsedSale[]; errors: string[] }> {
  const { data, errors } = await parseCsvFile(uri);
  const out: ParsedSale[] = [];
  const errs: string[] = errors.map(e => e.message ?? String(e));

  for (const row of data) {
    try {
      const v = SalesCsvRowSchema.parse({
        marketplace: row.marketplace ?? row.Marketplace ?? row.platform,
        marketplaceOrderId: row.marketplaceOrderId ?? row.orderId ?? row['Order ID'],
        soldAt: row.soldAt ?? row.date ?? row['Sold At'],
        title: row.title ?? row['Item Title'],
        sku: row.sku ?? row.SKU,
        salePrice: row.salePrice ?? row['Sale Price'] ?? row.price,
        shippingCharged: row.shippingCharged ?? row['Shipping Charged'] ?? row.shipping_income,
        shippingCost: row.shippingCost ?? row['Shipping Cost'] ?? row.shipping_label_cost,
        platformFees: row.platformFees ?? row['Platform Fees'] ?? row.fees,
        discounts: row.discounts ?? row['Discounts'],
        refunds: row.refunds ?? row['Refunds'],
        chargebacks: row.chargebacks ?? row['Chargebacks'],
        taxCollected: row.taxCollected ?? row['Sales Tax Collected'] ?? row.tax,
        taxRemittedByMarketplace: row.taxRemittedByMarketplace ?? row['Marketplace Remitted?'],
        currency: row.currency ?? row.Currency ?? 'USD',
        buyerState: row.buyer_state ?? row['Buyer State'],
        itemId: row.itemId ?? row['Item ID'],
      });

      const soldAt = parseMaybeDate(v.soldAt);
      const rec: ParsedSale = {
        marketplace: String(v.marketplace).trim().toLowerCase(),
        marketplaceOrderId: v.marketplaceOrderId ?? null,
        soldAt,
        salePriceCents: moneyToCents(v.salePrice as any),
        shippingChargedCents: moneyToCents(v.shippingCharged as any),
        shippingCostCents: moneyToCents(v.shippingCost as any),
        platformFeesCents: moneyToCents(v.platformFees as any),
        discountsCents: moneyToCents(v.discounts as any),
        refundsCents: moneyToCents(v.refunds as any),
        chargebacksCents: moneyToCents(v.chargebacks as any),
        taxCollectedCents: moneyToCents(v.taxCollected as any),
        taxRemittedByMarketplace: normBool(v.taxRemittedByMarketplace),
        currency: v.currency ?? 'USD',
        buyerState: v.buyerState ?? null,
        itemId: v.itemId ?? null,
        rawPayload: row,
        rowHash: sha256(JSON.stringify([sourceLabel, v.marketplace, v.marketplaceOrderId ?? '', soldAt, v.salePrice]))
      };
      out.push(rec);
    } catch (e: any) {
      errs.push(e.message ?? String(e));
    }
  }

  return { rows: out, errors: errs };
}

export async function parseExpensesCsv(uri: string, sourceLabel = 'unknown'): Promise<{ rows: ParsedExpense[]; errors: string[] }> {
  const { data, errors } = await parseCsvFile(uri);
  const out: ParsedExpense[] = [];
  const errs: string[] = errors.map(e => e.message ?? String(e));

  for (const row of data) {
    try {
      const v = ExpensesCsvRowSchema.parse({
        occurredAt: row.occurredAt ?? row.date ?? row['Date'],
        amount: row.amount ?? row['Amount'],
        category: row.category ?? row['Category'],
        vendor: row.vendor ?? row['Vendor'],
        method: row.method ?? row['Method'],
        note: row.note ?? row['Note'],
        mileageMiles: row.mileageMiles ?? row['Mileage'],
        vehicleRate: row.vehicleRate ?? row['Vehicle Rate']
      });

      const occurredAt = parseMaybeDate(v.occurredAt);
      const rec: ParsedExpense = {
        occurredAt,
        amountCents: moneyToCents(v.amount as any),
        category: v.category.trim(),
        vendor: v.vendor ?? null,
        method: v.method ?? null,
        note: v.note ?? null,
        mileageMiles: v.mileageMiles != null ? Number(v.mileageMiles) : null,
        vehicleRate: v.vehicleRate != null ? Number(v.vehicleRate) : null,
        rowHash: sha256(JSON.stringify([sourceLabel, occurredAt, v.amount, v.category, v.vendor ?? '']))
      };
      out.push(rec);
    } catch (e: any) {
      errs.push(e.message ?? String(e));
    }
  }

  return { rows: out, errors: errs };
}

function normBool(v?: string | null) {
  const s = String(v ?? '').trim().toLowerCase();
  return ['y', 'yes', 'true', '1'].includes(s);
}
