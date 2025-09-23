# Branching Strategy & Release Management

## Overview

This document outlines the branching strategy and release management for the OmniLister monorepo.

## Default Branch

- **Default Branch**: `main` (monorepo branch)
- **Archived Branch**: `mobile-app` (protected, no new commits)
- **All Releases**: Flow from the monorepo `main` branch

## Branch Structure

```
main (default)
├── apps/web/          # Web application
├── apps/mobile/       # Mobile application (React Native/Expo)
└── packages/          # Shared packages
    ├── core/          # Domain logic
    ├── api/           # Typed API client
    ├── flags/         # Feature flags
    └── tokens/        # Design tokens
```

## Release Cadence

### Web Releases
- **Frequency**: Weekly
- **Day**: Tuesday
- **Process**: Automated deployment from `main` branch

### Mobile Releases
- **Frequency**: Bi-weekly
- **Day**: Thursday
- **Process**: 
  - Beta builds (TestFlight + Play Internal) from `main` branch
  - Production releases require additional approval

## Branch Protection Rules

### `main` Branch
- Require pull request reviews (2 reviewers)
- Require status checks to pass
- Require branches to be up to date
- Restrict pushes to administrators

### `mobile-app` Branch (Archived)
- Protected from pushes
- Read-only access
- Historical reference only

## Release Process

### 1. Feature Development
- Create feature branch from `main`
- Implement changes across relevant apps/packages
- Update feature flags as needed
- Add/update tests

### 2. Pull Request
- Target: `main` branch
- Required checks:
  - Build passes for all apps
  - Tests pass
  - Linting passes
  - Type checking passes
- Required reviewers: 2
- Template includes:
  - Impacted app(s)
  - Flags touched
  - Migrations required

### 3. Release
- Merge to `main`
- Automated CI/CD triggers
- Web: Deploy to staging → production
- Mobile: Build and submit to app stores

## Migration from Old Structure

The `mobile-app` branch has been archived and its history preserved under `/apps/mobile`. All future development happens in the monorepo structure.

### Key Changes
- Mobile app code moved to `/apps/mobile`
- Shared logic extracted to `/packages/*`
- Single source of truth for all applications
- Unified CI/CD pipeline

## Emergency Procedures

### Hotfixes
- Create hotfix branch from `main`
- Apply minimal fix
- Fast-track review process
- Deploy immediately

### Rollbacks
- Web: Revert deployment to previous version
- Mobile: Submit previous build to app stores
- Document rollback reason and lessons learned

## Best Practices

1. **Keep commits atomic**: Each commit should represent a single logical change
2. **Use conventional commits**: Follow the established commit message format
3. **Update documentation**: Keep this document and related docs current
4. **Test thoroughly**: Ensure changes work across all platforms
5. **Monitor releases**: Watch for issues post-deployment

## Related Documents

- [RELEASES.md](./RELEASES.md) - Detailed release process
- [DEPLOY.md](../mobile/DEPLOY.md) - Mobile deployment guide
- [PRODUCTS.md](../payments/PRODUCTS.md) - Product and entitlement mapping
