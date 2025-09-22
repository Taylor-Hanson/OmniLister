# GitHub Actions Setup Guide

This guide will help you set up GitHub Actions for automated database branching with Neon.

## 🔧 Prerequisites

1. **Neon Account**: Create a free account at [neon.tech](https://neon.tech)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Admin Access**: You need admin access to the GitHub repository

## 📝 Step-by-Step Setup

### Step 1: Get Your Neon Credentials

#### Get Project ID
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project (the one with your marketplace database)
3. Go to **Settings** → **General**
4. Copy the **Project ID** (format: `ep-xxxxx-xxxxx`)

#### Create API Key
1. In Neon Console, click your **profile picture** (top right)
2. Go to **Account settings**
3. Navigate to **Developer settings** → **API keys**
4. Click **Create API key**
5. Give it a name like "GitHub Actions"
6. Copy the API key (starts with `neon_api_`)

### Step 2: Configure GitHub Repository

#### Add Repository Variables
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click the **Variables** tab
4. Click **New repository variable**
5. Add:
   - **Name**: `NEON_PROJECT_ID`
   - **Value**: Your Neon project ID (from Step 1)

#### Add Repository Secrets
1. Still in the same Actions page, click the **Secrets** tab
2. Click **New repository secret**
3. Add:
   - **Name**: `NEON_API_KEY`
   - **Value**: Your Neon API key (from Step 1)

### Step 3: Enable Workflow Permissions

1. In your repository, go to **Settings** → **Actions** → **General**
2. Scroll down to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

## 🧪 Testing the Setup

### Create a Test PR
1. Create a new branch: `git checkout -b test-neon-workflow`
2. Make a small change (like updating a comment)
3. Push and create a pull request
4. Watch the Actions tab for the workflow to run

### Expected Behavior
- ✅ A new database branch should be created
- ✅ Database migrations should run successfully
- ✅ A comment should appear on the PR with database info
- ✅ When you close the PR, the database branch should be deleted

## 🔍 Troubleshooting

### Common Issues

#### "Project not found" Error
- **Cause**: Incorrect `NEON_PROJECT_ID`
- **Solution**: Double-check the project ID in Neon Console

#### "Unauthorized" Error
- **Cause**: Incorrect or missing `NEON_API_KEY`
- **Solution**: Regenerate the API key and update the secret

#### "Workflow not running"
- **Cause**: Insufficient permissions
- **Solution**: Check workflow permissions in repository settings

#### "Migration failed"
- **Cause**: Schema errors or missing dependencies
- **Solution**: Test migrations locally first with `npm run db:push`

### Manual Branch Management

If needed, you can manually manage branches:

```bash
# Install Neon CLI
npm install -g @neondatabase/cli

# Login to Neon
neon auth

# List branches
neon branches list

# Create a branch
neon branches create my-feature-branch

# Delete a branch
neon branches delete my-feature-branch
```

## 🎯 Benefits of This Setup

### For Developers
- **Isolated Testing**: Each PR gets its own database
- **Safe Experimentation**: Test schema changes without fear
- **Faster Reviews**: Reviewers can test with real data
- **No Conflicts**: Multiple PRs can be tested simultaneously

### For the Project
- **Quality Assurance**: Automatic migration testing
- **Cost Control**: Automatic cleanup prevents resource waste
- **Scalability**: Supports multiple concurrent development streams
- **Documentation**: Automatic PR comments with environment info

## 🚀 Advanced Configuration

### Custom Branch Naming
You can customize the branch naming pattern in the workflow:

```yaml
branch_name: custom/pr-${{ github.event.number }}-${{ needs.setup.outputs.branch }}
```

### Extended Expiration
Change the branch expiration time:

```bash
# 30 days instead of 14
echo "EXPIRES_AT=$(date -u --date '+30 days' +'%Y-%m-%dT%H:%M:%SZ')" >> "$GITHUB_ENV"
```

### Additional Testing
Add more steps to the workflow:

```yaml
- name: Run Integration Tests
  run: npm run test:integration
  env:
    DATABASE_URL: "${{ steps.create_neon_branch.outputs.db_url_with_pooler }}"
```

## 📚 Resources

- [Neon Branching Guide](https://neon.tech/docs/guides/branching)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Drizzle Migrations](https://orm.drizzle.team/kit-docs/overview)
