import { z } from 'zod';

// Shared validation schemas
export const MoneySchema = z.number().int().min(0);
export const DateSchema = z.number().int().positive();
export const IdSchema = z.string().uuid();
export const OrgIdSchema = z.string().uuid();

// Item schemas
export const ItemSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  sku: z.string().optional(),
  title: z.string().min(1),
  brand: z.string().optional(),
  category: z.string().optional(),
  acquiredAt: DateSchema,
  acquiredFrom: z.string().optional(),
  purchasePriceCents: MoneySchema,
  notes: z.string().optional(),
  status: z.enum(['active', 'sold', 'archived']),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});

export const ItemExtraCostSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  itemId: IdSchema,
  kind: z.string().min(1),
  amountCents: MoneySchema,
  incurredAt: DateSchema,
  note: z.string().optional(),
});

// Sale schemas
export const SaleSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  marketplace: z.string().min(1),
  marketplaceOrderId: z.string().optional(),
  itemId: IdSchema.optional(),
  soldAt: DateSchema,
  salePriceCents: MoneySchema,
  shippingChargedCents: MoneySchema.default(0),
  shippingCostCents: MoneySchema.default(0),
  platformFeesCents: MoneySchema.default(0),
  discountsCents: MoneySchema.default(0),
  refundsCents: MoneySchema.default(0),
  chargebacksCents: MoneySchema.default(0),
  taxCollectedCents: MoneySchema.default(0),
  taxRemittedByMarketplace: z.boolean().default(true),
  payoutAt: DateSchema.optional(),
  payoutAmountCents: MoneySchema.default(0),
  currency: z.string().default('USD'),
  rawPayload: z.string().optional(),
  lockedCogsCents: MoneySchema.default(0),
  buyerState: z.string().optional(),
});

// Expense schemas
export const ExpenseSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  occurredAt: DateSchema,
  amountCents: MoneySchema,
  category: z.string().min(1),
  vendor: z.string().optional(),
  method: z.string().optional(),
  note: z.string().optional(),
  receiptKey: z.string().optional(),
  mileageMiles: z.number().positive().optional(),
  vehicleRate: z.number().positive().optional(),
});

// Invoice schemas
export const InvoiceSchema = z.object({
  id: IdSchema,
  orgId: OrgIdSchema,
  number: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional(),
  issuedAt: DateSchema,
  dueAt: DateSchema.optional(),
  subtotalCents: MoneySchema,
  taxCents: MoneySchema,
  totalCents: MoneySchema,
  status: z.enum(['draft', 'sent', 'paid', 'overdue']),
  pdfKey: z.string().optional(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});

// CSV import schemas
export const SalesCsvRowSchema = z.object({
  marketplace: z.string(),
  marketplaceOrderId: z.string().optional(),
  soldAt: z.string(),
  title: z.string().optional(),
  sku: z.string().optional(),
  salePrice: z.union([z.string(), z.number()]),
  shippingCharged: z.union([z.string(), z.number()]).optional(),
  shippingCost: z.union([z.string(), z.number()]).optional(),
  platformFees: z.union([z.string(), z.number()]).optional(),
  discounts: z.union([z.string(), z.number()]).optional(),
  refunds: z.union([z.string(), z.number()]).optional(),
  chargebacks: z.union([z.string(), z.number()]).optional(),
  taxCollected: z.union([z.string(), z.number()]).optional(),
  taxRemittedByMarketplace: z.string().optional(),
  currency: z.string().optional(),
  buyerState: z.string().optional(),
  itemId: z.string().optional(),
});

export const ExpensesCsvRowSchema = z.object({
  occurredAt: z.string(),
  amount: z.union([z.string(), z.number()]),
  category: z.string(),
  vendor: z.string().optional(),
  method: z.string().optional(),
  note: z.string().optional(),
  mileageMiles: z.union([z.string(), z.number()]).optional(),
  vehicleRate: z.union([z.string(), z.number()]).optional(),
});

// API request schemas
export const PnlReportRequestSchema = z.object({
  orgId: OrgIdSchema,
  from: DateSchema,
  to: DateSchema,
});

export const TaxSummaryRequestSchema = z.object({
  orgId: OrgIdSchema,
  from: DateSchema,
  to: DateSchema,
});

export const CsvImportRequestSchema = z.object({
  orgId: OrgIdSchema,
  source: z.string().default('upload'),
});

// Type exports
export type Item = z.infer<typeof ItemSchema>;
export type ItemExtraCost = z.infer<typeof ItemExtraCostSchema>;
export type Sale = z.infer<typeof SaleSchema>;
export type Expense = z.infer<typeof ExpenseSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type SalesCsvRow = z.infer<typeof SalesCsvRowSchema>;
export type ExpensesCsvRow = z.infer<typeof ExpensesCsvRowSchema>;
export type PnlReportRequest = z.infer<typeof PnlReportRequestSchema>;
export type TaxSummaryRequest = z.infer<typeof TaxSummaryRequestSchema>;
export type CsvImportRequest = z.infer<typeof CsvImportRequestSchema>;
