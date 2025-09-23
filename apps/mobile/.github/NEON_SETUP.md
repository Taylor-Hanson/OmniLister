# Neon Database Branch Setup

This repository is configured to automatically create and delete Neon database branches for pull requests.

## 🔧 Required Setup

To enable this functionality, you need to configure the following in your GitHub repository:

### 1. Repository Variables

Go to your repository Settings → Secrets and variables → Actions → Variables tab and add:

- `NEON_PROJECT_ID`: Your Neon project ID (found in your Neon dashboard)

### 2. Repository Secrets

Go to your repository Settings → Secrets and variables → Actions → Secrets tab and add:

- `NEON_API_KEY`: Your Neon API key (create one in your Neon account settings)

### 3. Workflow Permissions

Ensure your workflow has the necessary permissions by adding this to your repository settings:

```yaml
permissions:
  contents: read
  pull-requests: write
```

## 🚀 How It Works

### When a PR is opened/updated:
1. **Creates a new database branch** named `preview/pr-{number}-{branch-name}`
2. **Runs database migrations** to set up the schema
3. **Runs type checking** to validate the code
4. **Comments on the PR** with database information
5. **Sets expiration** to 2 weeks from creation

### When a PR is closed:
1. **Automatically deletes** the database branch
2. **Comments on the PR** confirming cleanup
3. **Frees up resources** in your Neon project

## 📊 Benefits

- **Isolated testing**: Each PR gets its own database
- **Safe migrations**: Test schema changes without affecting main database
- **Automatic cleanup**: No manual database management needed
- **Cost effective**: Branches auto-expire and are deleted
- **Easy debugging**: Full database access for testing

## 🔧 Getting Your Neon Credentials

### Project ID
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Go to Settings → General
4. Copy the Project ID

### API Key
1. Go to [Neon Console](https://console.neon.tech)
2. Click your profile → Account settings
3. Go to Developer settings → API keys
4. Create a new API key
5. Copy the key (store it securely)

## 🛠️ Local Development

For local development, you can still use your main database:

```bash
# Use your main Neon database connection string
DATABASE_URL=postgresql://username:password@ep-xxxxx.us-west-2.aws.neon.tech/neondb?sslmode=require

# Or create a dedicated development branch
npx neon branches create dev-your-name
```

## 🔍 Troubleshooting

### Common Issues

1. **"project_id not found"**
   - Verify `NEON_PROJECT_ID` is set correctly in repository variables
   - Check that the project ID matches your Neon project

2. **"Unauthorized"**
   - Verify `NEON_API_KEY` is set correctly in repository secrets
   - Ensure the API key has the necessary permissions

3. **"Branch already exists"**
   - The workflow will handle existing branches automatically
   - Old branches are cleaned up when PRs are closed

4. **Migration failures**
   - Check that your schema changes are valid
   - Ensure all required environment variables are set

### Manual Cleanup

If you need to manually clean up branches:

```bash
# List all branches
npx neon branches list

# Delete a specific branch
npx neon branches delete preview/pr-123-feature-branch
```

## 📚 Additional Resources

- [Neon Branching Documentation](https://neon.tech/docs/guides/branching)
- [GitHub Actions with Neon](https://neon.tech/docs/guides/github-actions)
- [Drizzle Migrations](https://orm.drizzle.team/kit-docs/overview)
