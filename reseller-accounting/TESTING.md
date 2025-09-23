# Testing Guide

This guide covers testing the OmniLister Reseller Accounting Module.

## Testing Strategy

### 1. Unit Tests
- Test individual functions and utilities
- Validate business logic
- Test data transformations
- Mock external dependencies

### 2. Component Tests
- Test React Native components
- Validate user interactions
- Test state management
- Mock navigation and APIs

### 3. Integration Tests
- Test Edge Functions
- Validate database operations
- Test API endpoints
- Test authentication flows

### 4. End-to-End Tests
- Test complete user workflows
- Validate cross-platform functionality
- Test offline/online scenarios
- Test data synchronization

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/utils/money.test.ts
```

### Component Tests

```bash
# Run component tests
npm run test:components

# Run with React Native Testing Library
npm run test:components -- --testPathPattern=components
```

### Integration Tests

```bash
# Test Edge Functions locally
supabase functions serve

# Test specific function
curl -X GET "http://localhost:54321/functions/v1/pnl-report?orgId=test&from=1000&to=2000"

# Test with authentication
curl -X GET "http://localhost:54321/functions/v1/pnl-report?orgId=test&from=1000&to=2000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### End-to-End Tests

```bash
# Run E2E tests (requires device/simulator)
npm run test:e2e

# Run on specific platform
npm run test:e2e:ios
npm run test:e2e:android
```

## Test Structure

### Unit Tests

```typescript
// src/utils/money.test.ts
import { toCents, fromCents, formatMoney } from './money';

describe('Money Utils', () => {
  test('converts dollars to cents', () => {
    expect(toCents(10.50)).toBe(1050);
    expect(toCents('10.50')).toBe(1050);
  });

  test('converts cents to dollars', () => {
    expect(fromCents(1050)).toBe(10.50);
  });

  test('formats money correctly', () => {
    expect(formatMoney(1050)).toBe('$10.50');
    expect(formatMoney(1050, 'EUR')).toBe('€10.50');
  });
});
```

### Component Tests

```typescript
// src/components/__tests__/MoneyInput.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MoneyInput } from '../MoneyInput';

describe('MoneyInput', () => {
  test('renders correctly', () => {
    const { getByPlaceholderText } = render(
      <MoneyInput placeholder="Enter amount" />
    );
    expect(getByPlaceholderText('Enter amount')).toBeTruthy();
  });

  test('handles input changes', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <MoneyInput placeholder="Enter amount" onChange={onChange} />
    );
    
    fireEvent.changeText(getByPlaceholderText('Enter amount'), '10.50');
    expect(onChange).toHaveBeenCalledWith(1050);
  });
});
```

### Integration Tests

```typescript
// supabase/functions/__tests__/pnl-report.test.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

describe('P&L Report Function', () => {
  test('returns correct P&L data', async () => {
    const req = new Request(
      'http://localhost:54321/functions/v1/pnl-report?orgId=test&from=1000&to=2000'
    );
    
    const response = await serve(req);
    const data = await response.json();
    
    expect(data.totals).toBeDefined();
    expect(data.trend).toBeDefined();
    expect(data.orgId).toBe('test');
  });
});
```

## Test Data

### Sample Data Sets

```typescript
// test-data/sales.ts
export const sampleSales = [
  {
    id: '1',
    orgId: 'test-org',
    marketplace: 'ebay',
    soldAt: 1640995200000, // 2022-01-01
    salePriceCents: 8500,
    shippingChargedCents: 1299,
    platformFeesCents: 850,
    // ... other fields
  },
  // ... more sample data
];

// test-data/expenses.ts
export const sampleExpenses = [
  {
    id: '1',
    orgId: 'test-org',
    occurredAt: 1640995200000,
    amountCents: 2599,
    category: 'shipping_supplies',
    vendor: 'Amazon',
    // ... other fields
  },
  // ... more sample data
];
```

### Mock Data

```typescript
// __mocks__/supabase.ts
export const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => Promise.resolve({ data: null, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null }))
  }))
};
```

## Test Scenarios

### 1. Financial Calculations

```typescript
describe('COGS Calculations', () => {
  test('calculates locked COGS correctly', () => {
    const purchasePrice = 2500; // $25.00
    const extraCosts = [500, 300]; // $5.00, $3.00
    const lockedCogs = lockedCogsCents(purchasePrice, extraCosts);
    expect(lockedCogs).toBe(3300); // $33.00
  });

  test('calculates gross profit correctly', () => {
    const salePrice = 8500; // $85.00
    const shippingCharged = 1299; // $12.99
    const cogs = 3300; // $33.00
    const shippingCost = 850; // $8.50
    const platformFees = 850; // $8.50
    
    const grossProfit = grossProfitCents(
      salePrice, shippingCharged, cogs, shippingCost, platformFees, 0, 0, 0
    );
    expect(grossProfit).toBe(4699); // $46.99
  });
});
```

### 2. Data Validation

```typescript
describe('Data Validation', () => {
  test('validates sale data', () => {
    const validSale = {
      orgId: 'test-org',
      marketplace: 'ebay',
      soldAt: 1640995200000,
      salePriceCents: 8500,
      // ... other required fields
    };
    
    expect(() => saleSchema.parse(validSale)).not.toThrow();
  });

  test('rejects invalid sale data', () => {
    const invalidSale = {
      orgId: 'test-org',
      marketplace: '', // Invalid: empty string
      soldAt: 'invalid-date', // Invalid: not a number
      salePriceCents: -100, // Invalid: negative price
    };
    
    expect(() => saleSchema.parse(invalidSale)).toThrow();
  });
});
```

### 3. CSV Import

```typescript
describe('CSV Import', () => {
  test('parses sales CSV correctly', async () => {
    const csvContent = `marketplace,soldAt,salePrice
ebay,2024-01-15,85.00
poshmark,2024-01-16,45.00`;
    
    const result = await parseSalesCsv(csvContent);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].marketplace).toBe('ebay');
    expect(result.rows[0].salePriceCents).toBe(8500);
  });

  test('handles duplicate rows', async () => {
    const csvContent = `marketplace,soldAt,salePrice
ebay,2024-01-15,85.00
ebay,2024-01-15,85.00`; // Duplicate
    
    const result = await parseSalesCsv(csvContent);
    expect(result.rows).toHaveLength(1); // Only one unique row
    expect(result.errors).toContain('Duplicate row skipped');
  });
});
```

### 4. Authentication

```typescript
describe('Authentication', () => {
  test('stores session securely', async () => {
    const session = { access_token: 'test-token', user: { id: 'test-user' } };
    
    await useAuthStore.getState().setSession(session);
    
    const stored = await SecureStore.getItemAsync('supabase_session');
    expect(stored).toBe(JSON.stringify(session));
  });

  test('redirects unauthenticated users', () => {
    const { getByText } = render(<App />);
    expect(getByText('Sign In')).toBeTruthy();
  });
});
```

## Performance Testing

### 1. Load Testing

```typescript
describe('Performance', () => {
  test('handles large datasets', async () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: `item-${i}`,
      orgId: 'test-org',
      // ... other fields
    }));
    
    const start = Date.now();
    await processLargeDataset(largeDataset);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
  });
});
```

### 2. Memory Testing

```typescript
describe('Memory Usage', () => {
  test('does not leak memory', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform operations that might cause memory leaks
    for (let i = 0; i < 1000; i++) {
      processData();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
  });
});
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm test
        
      - name: Run component tests
        run: npm run test:components
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Coverage

### Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Component Tests**: 80%+ coverage
- **Integration Tests**: 70%+ coverage
- **Critical Paths**: 100% coverage

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## Debugging Tests

### 1. Debug Mode

```bash
# Run tests in debug mode
npm test -- --debug

# Run specific test in debug mode
npm test -- --debug --testNamePattern="Money Utils"
```

### 2. Verbose Output

```bash
# Run tests with verbose output
npm test -- --verbose

# Run tests with detailed output
npm test -- --detectOpenHandles
```

### 3. Test Isolation

```bash
# Run tests in isolation
npm test -- --runInBand

# Run tests with clean state
npm test -- --clearCache
```

## Best Practices

### 1. Test Organization

- Group related tests in describe blocks
- Use descriptive test names
- Keep tests focused and atomic
- Avoid test interdependencies

### 2. Test Data

- Use realistic test data
- Create reusable test fixtures
- Mock external dependencies
- Clean up test data

### 3. Assertions

- Use specific assertions
- Test both positive and negative cases
- Validate error conditions
- Check edge cases

### 4. Performance

- Keep tests fast
- Use parallel execution where possible
- Avoid unnecessary setup/teardown
- Monitor test execution time
