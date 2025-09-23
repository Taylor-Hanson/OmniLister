# Flip Default Branch to Monorepo

## Overview

This script helps verify and provides instructions for setting the monorepo branch as the default branch in GitHub.

## Prerequisites

- GitHub CLI installed (`gh`)
- Repository access
- Admin permissions on the repository

## Verification Script

```bash
#!/bin/bash

# Check current default branch
echo "Checking current default branch..."
CURRENT_DEFAULT=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')
echo "Current default branch: $CURRENT_DEFAULT"

# Check if monorepo branch exists
echo "Checking for monorepo branch..."
MONOREPO_BRANCH="main"
if gh api repos/:owner/:repo/branches/$MONOREPO_BRANCH >/dev/null 2>&1; then
    echo "✅ Monorepo branch '$MONOREPO_BRANCH' exists"
else
    echo "❌ Monorepo branch '$MONOREPO_BRANCH' not found"
    exit 1
fi

# Check if mobile-app branch exists (should be archived)
echo "Checking for mobile-app branch..."
if gh api repos/:owner/:repo/branches/mobile-app >/dev/null 2>&1; then
    echo "✅ Mobile-app branch exists (should be archived)"
else
    echo "ℹ️  Mobile-app branch not found (may already be archived)"
fi

# Verify monorepo structure
echo "Verifying monorepo structure..."
if gh api repos/:owner/:repo/contents/apps >/dev/null 2>&1; then
    echo "✅ /apps directory exists"
else
    echo "❌ /apps directory not found"
    exit 1
fi

if gh api repos/:owner/:repo/contents/packages >/dev/null 2>&1; then
    echo "✅ /packages directory exists"
else
    echo "❌ /packages directory not found"
    exit 1
fi

# Check if default branch is already correct
if [ "$CURRENT_DEFAULT" = "$MONOREPO_BRANCH" ]; then
    echo "✅ Default branch is already set to '$MONOREPO_BRANCH'"
    echo "No action needed."
else
    echo "⚠️  Default branch needs to be changed from '$CURRENT_DEFAULT' to '$MONOREPO_BRANCH'"
    echo ""
    echo "To change the default branch:"
    echo "1. Go to GitHub repository settings"
    echo "2. Navigate to 'General' > 'Default branch'"
    echo "3. Click 'Switch to another branch'"
    echo "4. Select '$MONOREPO_BRANCH'"
    echo "5. Click 'Update'"
    echo "6. Confirm the change"
    echo ""
    echo "Or use GitHub CLI:"
    echo "gh api repos/:owner/:repo --method PATCH --field default_branch='$MONOREPO_BRANCH'"
fi

echo ""
echo "Verification complete."
```

## Manual Steps (if needed)

### 1. Change Default Branch in GitHub UI

1. Navigate to your repository on GitHub
2. Go to **Settings** → **General**
3. Scroll down to **Default branch**
4. Click **Switch to another branch**
5. Select `main` (monorepo branch)
6. Click **Update**
7. Confirm the change

### 2. Archive Mobile-App Branch

1. Go to **Settings** → **Branches**
2. Find the `mobile-app` branch
3. Click **Edit** next to the branch protection rule
4. Enable **Restrict pushes that create files**
5. Save changes

### 3. Update Branch Protection Rules

1. Go to **Settings** → **Branches**
2. Add or edit protection rule for `main` branch:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (2 reviewers)
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Restrict pushes that create files

### 4. Update CI/CD Workflows

Ensure all GitHub Actions workflows reference the correct default branch:

```yaml
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
```

## Verification Checklist

After making changes, verify:

- [ ] Default branch is set to `main`
- [ ] `mobile-app` branch is protected (read-only)
- [ ] Branch protection rules are active on `main`
- [ ] CI/CD workflows are updated
- [ ] All team members are notified
- [ ] Documentation is updated

## Rollback Plan

If issues arise:

1. **Immediate**: Change default branch back to previous branch
2. **Investigate**: Identify the root cause
3. **Fix**: Address the issue in the monorepo
4. **Retry**: Attempt the switch again

## Communication Template

```markdown
## 🚀 Default Branch Migration Complete

The repository default branch has been successfully migrated to the monorepo structure.

### What Changed
- Default branch: `mobile-app` → `main`
- All development now happens in the monorepo
- Mobile app code preserved under `/apps/mobile`

### What You Need to Do
1. Update your local repository:
   ```bash
   git fetch origin
   git checkout main
   git pull origin main
   ```

2. Update any bookmarks or scripts that reference the old branch

3. All future PRs should target the `main` branch

### Questions?
Reach out to the engineering team if you encounter any issues.
```

## Troubleshooting

### Common Issues

1. **Branch not found**: Ensure the monorepo branch exists and is pushed
2. **Permission denied**: Verify you have admin access to the repository
3. **CI/CD failures**: Check that workflows are updated for the new default branch
4. **Team confusion**: Send clear communication about the change

### Support

For issues with this migration:
- Check the [BRANCHING.md](../../docs/release/BRANCHING.md) documentation
- Contact the engineering team
- Create an issue in the repository
