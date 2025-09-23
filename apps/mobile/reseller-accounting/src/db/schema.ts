import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Money as INTEGER cents to avoid FP errors
const money = () => integer().notNull(); // store cents

export const items = sqliteTable('items', {
  id: text().primaryKey(),
  orgId: text().notNull(),
  sku: text(),
  title: text().notNull(),
  brand: text(),
  category: text(),
  acquiredAt: integer().notNull(), // epoch ms
  acquiredFrom: text(),
  purchasePriceCents: money(),
  notes: text(),
  status: text().notNull(), // active, sold, archived
  createdAt: integer().notNull().default(sql`unixepoch()*1000`),
  updatedAt: integer().notNull().default(sql`unixepoch()*1000`)
});

export const itemExtraCosts = sqliteTable('item_extra_costs', {
  id: text().primaryKey(),
  orgId: text().notNull(),
  itemId: text().notNull().references(() => items.id),
  kind: text().notNull(), // auth, repair, etc.
  amountCents: money(),
  incurredAt: integer().notNull(),
  note: text()
});

export const sales = sqliteTable('sales', {
  id: text().primaryKey(),
  orgId: text().notNull(),
  marketplace: text().notNull(),
  marketplaceOrderId: text(),
  itemId: text().references(() => items.id),
  soldAt: integer().notNull(),
  salePriceCents: money(),
  shippingChargedCents: integer().notNull().default(0),
  shippingCostCents: integer().notNull().default(0),
  platformFeesCents: integer().notNull().default(0),
  discountsCents: integer().notNull().default(0),
  refundsCents: integer().notNull().default(0),
  chargebacksCents: integer().notNull().default(0),
  taxCollectedCents: integer().notNull().default(0),
  taxRemittedByMarketplace: integer({ mode: 'boolean' }).notNull().default(1),
  payoutAt: integer(),
  payoutAmountCents: integer().default(0),
  currency: text().notNull().default('USD'),
  rawPayload: text(),
  lockedCogsCents: integer().notNull().default(0),
  buyerState: text()
});

export const expenses = sqliteTable('expenses', {
  id: text().primaryKey(),
  orgId: text().notNull(),
  occurredAt: integer().notNull(),
  amountCents: money(),
  category: text().notNull(),
  vendor: text(),
  method: text(),
  note: text(),
  receiptKey: text(),
  mileageMiles: real(),
  vehicleRate: real()
});

export const invoices = sqliteTable('invoices', {
  id: text().primaryKey(),
  orgId: text().notNull(),
  number: text().notNull(),
  customerName: text().notNull(),
  customerEmail: text(),
  issuedAt: integer().notNull(),
  dueAt: integer(),
  subtotalCents: money(),
  taxCents: money(),
  totalCents: money(),
  status: text().notNull(), // draft, sent, paid, overdue
  pdfKey: text(),
  createdAt: integer().notNull().default(sql`unixepoch()*1000`),
  updatedAt: integer().notNull().default(sql`unixepoch()*1000`)
});

export const payments = sqliteTable('payments', {
  id: text().primaryKey(),
  orgId: text().notNull(),
  invoiceId: text().notNull().references(() => invoices.id),
  method: text().notNull(),
  receivedAt: integer().notNull(),
  amountCents: money(),
  reference: text()
});

export const accountMappings = sqliteTable('account_mappings', {
  id: text().primaryKey(),
  orgId: text().notNull(),
  provider: text().notNull(), // quickbooks, xero
  accountType: text().notNull(),
  externalAccountId: text().notNull(),
  name: text()
});

export const journalExports = sqliteTable('journal_exports', {
  id: text().primaryKey(),
  orgId: text().notNull(),
  provider: text().notNull(),
  periodStart: integer().notNull(),
  periodEnd: integer().notNull(),
  status: text().notNull(), // preview, committed, error
  preview: text(), // JSON
  payload: text(), // JSON
  createdAt: integer().notNull().default(sql`unixepoch()*1000`),
  createdBy: text().notNull()
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text().primaryKey(),
  orgId: text().notNull(),
  actorId: text().notNull(),
  entityType: text().notNull(),
  entityId: text().notNull(),
  action: text().notNull(),
  before: text(), // JSON
  after: text(), // JSON
  at: integer().notNull().default(sql`unixepoch()*1000`)
});

// Sync tracking
export const syncState = sqliteTable('sync_state', {
  id: text().primaryKey(),
  orgId: text().notNull(),
  tableName: text().notNull(),
  lastSyncAt: integer().notNull(),
  lastSyncToken: text()
});
