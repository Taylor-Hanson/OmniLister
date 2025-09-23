# Definitions of Done

This document defines the criteria for completion for each major section of the OmniLister monorepo implementation.

## A) Branch & Release Management

### Definition of Done
- [ ] Default branch confirmed via workflow output
- [ ] `BRANCHING.md` present and accurate
- [ ] Old `mobile-app` branch archived (protected, no new commits)
- [ ] Release documentation (`RELEASES.md`) created
- [ ] GitHub Actions workflow for default branch verification implemented
- [ ] PR template updated to reference monorepo paths
- [ ] All team members notified of branch changes

### Acceptance Criteria
- GitHub UI shows monorepo branch as default
- Workflow runs successfully and reports correct default branch
- Old branch is read-only and cannot accept new commits
- Documentation is accessible and up-to-date
- PR template includes required fields for monorepo

### Smoke Check
```bash
# Verify default branch
gh api repos/:owner/:repo --jq '.default_branch'

# Check workflow status
gh workflow list
gh workflow run verify-default-branch.yml
```

## B) Mobile Beta Push (App Stores)

### Definition of Done
- [ ] EAS configuration files created (`app.config.js`, `eas.json`)
- [ ] GitHub Actions workflow for EAS Build + Submit implemented
- [ ] Mobile deployment documentation (`DEPLOY.md`) created
- [ ] Push notifications service implemented with platform-safe code
- [ ] Offline queue service implemented with retry policy
- [ ] Camera listing flow service implemented
- [ ] Mobile build scripts added to root `package.json`
- [ ] All required dependencies added to mobile `package.json`
- [ ] Icons and splash placeholders created
- [ ] Bundle identifiers configured (placeholders)

### Acceptance Criteria
- `npm run mobile:beta:ios` and `npm run mobile:beta:android` build locally
- EAS builds produce artifacts (or fail gracefully with clear error messages)
- Push notifications service compiles without errors
- Offline queue service handles retry logic correctly
- Camera service integrates with Expo camera APIs
- Documentation includes exact commands and required secrets
- All mobile-specific features are feature-flagged

### Smoke Check
```bash
# Test mobile build commands
npm run mobile:beta:ios
npm run mobile:beta:android

# Verify mobile services compile
cd apps/mobile/OmniListerMobile
npx tsc --noEmit

# Check feature flags
node -e "console.log(require('@omnilister/flags').flag('mobile.pushNotifications'))"
```

## C) Feature Flags & Entitlements (Paywall)

### Definition of Done
- [ ] Feature flags package implemented with `flag()` and `variants()` functions
- [ ] Default flags defined for mobile-specific, web-specific, and paywall features
- [ ] Entitlements service implemented with user entitlement management
- [ ] Mobile IAP service implemented with purchase, restore, and product management
- [ ] Backend endpoint for receipt verification created
- [ ] Product SKUs documented across Apple/Google/Web platforms
- [ ] PaywallModal component created for mobile app
- [ ] Entitlement checks gate advanced features in both apps
- [ ] Flags toggle behavior correctly in both apps

### Acceptance Criteria
- Feature flags return boolean values and can be toggled
- Entitlements service manages user access to paid features
- IAP service handles purchase flow and receipt verification
- Receipt verification endpoint is reachable and returns expected responses
- Product documentation maps SKUs to entitlements correctly
- Paywall modal displays and handles purchase flow
- Advanced features are properly gated behind entitlements
- Flags control feature availability across platforms

### Smoke Check
```bash
# Test feature flags
node -e "console.log(require('@omnilister/flags').flag('mobile.dualAi'))"
node -e "console.log(require('@omnilister/flags').flag('web.pricingAutomation'))"

# Test entitlements
node -e "require('@omnilister/core').entitlementsService.hasEntitlement('test-user', 'ADV_AUTOMATION').then(console.log)"

# Test IAP service
node -e "require('./apps/mobile/OmniListerMobile/src/services/iap').iapService.getAvailableProducts().then(console.log)"
```

## D) Backfill to Web (Pricing Automation & Analytics)

### Definition of Done
- [ ] Pricing rules engine moved to `/packages/core/pricing-rules`
- [ ] Web UI for pricing rules created (`/apps/web/pages/pricing-rules`)
- [ ] Analytics service implemented in `/packages/core/analytics`
- [ ] Web analytics dashboard created (`/apps/web/pages/analytics`)
- [ ] API endpoints typed in `/packages/api`
- [ ] Server handlers reuse shared core logic
- [ ] Feature flag `web.pricingAutomation` controls access
- [ ] Feature flag `web.analytics` controls access
- [ ] Unit tests for rule evaluation pass
- [ ] E2E smoke tests for pricing rules pass

### Acceptance Criteria
- Pricing rules UI allows creation, editing, and toggling of rules
- Analytics dashboard displays metrics and allows filtering
- API endpoints are properly typed and documented
- Core logic is shared between web and mobile
- Feature flags control access to advanced features
- Tests pass for rule evaluation and analytics calculations
- CSV export functionality works for analytics data

### Smoke Check
```bash
# Test pricing rules engine
node -e "const engine = require('@omnilister/core').pricingRulesEngine; console.log(engine.getRules().length)"

# Test analytics service
node -e "require('@omnilister/core').analyticsService.getOverview({start: new Date('2024-01-01'), end: new Date('2024-01-31')}).then(console.log)"

# Test web app compilation
cd apps/web
npm run build
```

## E) Smoke Tests & Verification

### Definition of Done
- [ ] Root "smoke" script created (`/scripts/smoke.ts`)
- [ ] Smoke script verifies flags wiring
- [ ] Smoke script verifies entitlement read path
- [ ] Smoke script verifies core pricing evaluation
- [ ] Smoke script verifies analytics aggregation query
- [ ] Smoke script runs headless checks for key functionalities
- [ ] Smoke script provides clear pass/fail output
- [ ] Smoke script can be run in CI/CD pipelines

### Acceptance Criteria
- Smoke script runs without errors
- All key functionalities are verified
- Script provides clear output for debugging
- Script exits with appropriate exit codes
- Script can be run in automated environments
- Script covers all major components

### Smoke Check
```bash
# Run smoke tests
npm run smoke

# Verify exit codes
echo $? # Should be 0 for success, 1 for failure
```

## Overall Project Completion

### Definition of Done
- [ ] All individual sections meet their DoD criteria
- [ ] Smoke tests pass for all components
- [ ] Documentation is complete and accurate
- [ ] All required secrets are documented (no values in repo)
- [ ] CI/CD pipelines are configured and working
- [ ] Both web and mobile apps can be built and run
- [ ] Feature flags control access to all advanced features
- [ ] Entitlements system gates paid features correctly
- [ ] Shared core logic is used across platforms
- [ ] All tests pass

### Final Verification
```bash
# Run all smoke tests
npm run smoke

# Build all packages
npm run build

# Run all tests
npm run test

# Verify both apps can start
npm run dev:web &
npm run dev:mobile &
```

## Success Metrics

- **Build Success**: All packages build without errors
- **Test Coverage**: All smoke tests pass
- **Feature Parity**: Core functionality works across platforms
- **Performance**: No significant performance regressions
- **Security**: No secrets exposed in repository
- **Documentation**: All features are documented
- **Maintainability**: Code follows established patterns

## Rollback Plan

If any section fails to meet its DoD criteria:

1. **Immediate**: Revert to previous working state
2. **Short-term**: Fix critical issues and re-test
3. **Long-term**: Re-evaluate requirements and approach

## Post-Completion Tasks

- [ ] Update team documentation
- [ ] Schedule team training on new features
- [ ] Set up monitoring and alerting
- [ ] Plan user migration strategy
- [ ] Prepare release notes
- [ ] Schedule post-launch review
