export type BucketKey =
  | 'revenue'
  | 'shipping_income'
  | 'fees_expense'
  | 'refunds_contra'
  | 'chargebacks_expense'
  | 'shipping_cost'
  | 'sales_tax_liability'
  | 'clearing';

export const REQUIRED_BUCKETS: { key: BucketKey; label: string; hint?: string }[] = [
  { key: 'revenue',              label: 'Revenue (Sales)' },
  { key: 'shipping_income',      label: 'Shipping Income' },
  { key: 'fees_expense',         label: 'Marketplace Fees (Expense)' },
  { key: 'refunds_contra',       label: 'Refunds (Contra-Revenue)', hint: 'Income account flagged as contra is okay, or a separate contra account.' },
  { key: 'chargebacks_expense',  label: 'Chargebacks (Expense)' },
  { key: 'shipping_cost',        label: 'Shipping Labels (COGS/Expense)' },
  { key: 'sales_tax_liability',  label: 'Sales Tax Payable (Liability)' },
  { key: 'clearing',             label: 'Clearing / Undeposited Funds (Asset)' },
];

type RecoRule = {
  acct_type?: string[];      // e.g., ['Income','Other Income','Expense','Cost of Goods Sold','Other Current Liability','Bank','Other Current Asset']
  acct_subtype?: string[];   // optional tighter filter
};

// What account TYPES make sense per bucket:
export const RECOMMENDED_BY_BUCKET: Record<BucketKey, RecoRule> = {
  revenue:             { acct_type: ['Income','Other Income'] },
  shipping_income:     { acct_type: ['Income','Other Income'] },
  fees_expense:        { acct_type: ['Expense','Other Expense'] },
  refunds_contra:      { acct_type: ['Income','Other Income'] }, // many folks use contra-income; you could also allow 'Expense'
  chargebacks_expense: { acct_type: ['Expense','Other Expense'] },
  shipping_cost:       { acct_type: ['Expense','Cost of Goods Sold','Other Expense'] },
  sales_tax_liability: { acct_type: ['Other Current Liability','Long Term Liability'] },
  clearing:            { acct_type: ['Bank','Other Current Asset'] }, // Undeposited Funds often = Other Current Asset
};
