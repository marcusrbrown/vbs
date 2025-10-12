# Automated Star Trek Data Updates

This document describes the automated workflow for updating Star Trek episode and movie data in the VBS application.

## Overview

The VBS project includes a GitHub Actions workflow that automatically checks for new Star Trek content and updates the `src/data/star-trek-data.ts` file. The workflow runs weekly and can also be triggered manually for on-demand updates.

## Workflow Features

### Scheduled Updates

- **Frequency:** Weekly on Mondays at 09:00 UTC
- **Purpose:** Automatically detect and integrate new Star Trek content as it's released
- **Concurrency:** Only one data update workflow runs at a time to prevent conflicts

### Manual Triggers

The workflow can be manually triggered via the GitHub Actions UI with the following options:

- **Mode:** Choose between `full` (complete regeneration) or `incremental` (update only new content)
- **Series Filter:** Target a specific Star Trek series (e.g., `discovery`, `picard`)
- **Dry Run:** Preview changes without creating a pull request

## Workflow Steps

### 1. Environment Setup

- Checks out the repository with full git history
- Sets up Node.js 22.x and pnpm (matching CI configuration)
- Installs dependencies with lockfile verification
- Configures git identity for automated commits

### 2. Data Generation

- Executes `scripts/generate-star-trek-data.ts` with configured options
- Fetches metadata from TMDB and other sources
- Normalizes data to VBS format
- Generates TypeScript code with proper formatting

### 3. Validation

- Runs `scripts/validate-episode-data.ts` against generated data
- Verifies episode ID formats and uniqueness
- Checks for required fields and data completeness
- Validates chronological ordering and cross-references

### 4. Change Detection

- Compares generated data with existing file
- Creates diff summary for review
- Skips PR creation if no changes detected

### 5. Quality Assessment

- Generates data quality report
- Includes completeness metrics
- Documents validation results
- Tracks data source attribution

### 6. Pull Request Creation

- Creates automated PR with descriptive title
- Includes detailed changelog and diff statistics
- Adds quality report and validation status
- Labels PR with `automated` and `data-update`
- Assigns to repository owner for review
- Uploads diff artifact for detailed review

## Configuration

### Required Secrets

The workflow requires the following GitHub repository secrets:

#### TMDB_API_KEY

- **Description:** The Movie Database API Read Access Token (Bearer token)
- **Required:** Yes (recommended for enhanced metadata)
- **How to obtain:**
  1. Create account at https://www.themoviedb.org/
  2. Go to https://www.themoviedb.org/settings/api
  3. Generate API Read Access Token (v4 auth)
  4. Add as repository secret in Settings → Secrets and variables → Actions

#### Setting up secrets:

1. Navigate to repository Settings
2. Click "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add `TMDB_API_KEY` with your API token

### Branch Protection

For security and data quality, configure branch protection rules:

1. Navigate to Settings → Branches
2. Add rule for `main` branch
3. Enable "Require a pull request before merging"
4. Enable "Require approvals" (minimum 1)
5. Enable "Require status checks to pass before merging"
6. Select CI workflow status checks

This ensures all automated data updates are reviewed before merging.

## Manual Workflow Execution

### Via GitHub UI

1. Navigate to **Actions** tab
2. Select **Update Star Trek Data** workflow
3. Click **Run workflow** button
4. Configure options:
   - **Mode:** Full or incremental update
   - **Series:** Specific series to target (optional)
   - **Dry run:** Enable to preview without creating PR
5. Click **Run workflow**

### Via GitHub CLI

```bash
# Full update (default)
gh workflow run update-star-trek-data.yaml

# Incremental update for specific series
gh workflow run update-star-trek-data.yaml \
  -f mode=incremental \
  -f series=discovery

# Dry run to preview changes
gh workflow run update-star-trek-data.yaml \
  -f dry_run=true
```

## Pull Request Review Process

When an automated PR is created:

### Review Checklist

1. **Data Accuracy**
   - Verify new episodes/movies are correctly categorized
   - Check episode numbers and season assignments
   - Validate air dates and stardates

2. **Manual Edits Preservation**
   - Ensure custom notes and annotations are preserved
   - Verify manually added connections are intact
   - Check for any unintended overwrites

3. **Quality Metrics**
   - Review completeness percentages
   - Check for validation warnings or errors
   - Verify all required fields are populated

4. **Chronology**
   - Confirm new content is in correct era
   - Validate stardate ordering
   - Check timeline consistency

5. **Code Quality**
   - Verify TypeScript compiles without errors
   - Confirm linting passes
   - Check test suite status

### Approval and Merge

- **Required:** At least one approval from repository maintainer
- **CI Checks:** All CI checks must pass (linting, type-check, tests)
- **Merge Strategy:** Squash and merge recommended for clean history
- **Post-Merge:** Verify deployment succeeds and app functions correctly

## Troubleshooting

### Workflow Fails at Data Generation

**Possible causes:**

- TMDB API key missing or invalid
- API rate limiting
- Network connectivity issues

**Solutions:**

1. Check `TMDB_API_KEY` secret is configured correctly
2. Review workflow logs for specific error messages
3. Re-run workflow after API rate limit resets
4. Contact TMDB support if API issues persist

### Validation Fails

**Possible causes:**

- Generated data has invalid episode IDs
- Missing required fields
- Chronology ordering issues

**Solutions:**

1. Review validation error messages in workflow logs
2. Check data quality report in PR description
3. Run validation locally: `pnpm exec jiti scripts/validate-episode-data.ts --verbose`
4. Fix issues in `generate-star-trek-data.ts` script
5. Consider opening issue if validation logic needs adjustment

### No Changes Detected

**Possible causes:**

- All data is already up to date
- API returned no new content
- Incremental mode skipped unchanged series

**Expected behavior:** Workflow completes successfully but doesn't create PR

**Actions:** None required - this indicates data is current

### PR Creation Fails

**Possible causes:**

- Missing required permissions
- Branch already exists
- GitHub API issues

**Solutions:**

1. Verify workflow has `contents: write` and `pull-requests: write` permissions
2. Delete existing automated branch if it exists
3. Re-run workflow
4. Check GitHub status page for API issues

## Workflow Security

### Security Best Practices

1. **Secret Management**
   - API keys stored as encrypted GitHub secrets
   - Never logged or exposed in workflow output
   - Masked in GitHub Actions logs

2. **Least Privilege**
   - Workflow uses minimal required permissions
   - Write access granted only for specific jobs
   - Branch protection prevents unauthorized merges

3. **Code Review**
   - All automated PRs require manual approval
   - Changes reviewed before merging
   - CI checks validate code quality

4. **Supply Chain Security**
   - All Actions pinned to specific commit SHAs
   - Dependencies verified with lockfile
   - Regular security updates via Dependabot

### Audit Trail

- Every data update creates permanent PR record
- Workflow run logs retained for 90 days
- Git history preserves all changes
- Quality reports document data sources

## Monitoring and Alerts

### Workflow Status

- **Success:** Green checkmark, PR created (if changes detected)
- **Failure:** Red X, error notifications sent
- **No changes:** Green checkmark, no PR created

### Notifications

- Repository owner assigned to automated PRs
- GitHub notifications for workflow failures
- Email alerts for failed workflow runs (configurable in GitHub settings)

### Metrics

- View workflow execution history in Actions tab
- Track PR merge rate and review time
- Monitor data quality scores over time
- Analyze API usage and rate limiting

## Local Development

### Running Data Generation Locally

```bash
# Full regeneration
pnpm exec jiti scripts/generate-star-trek-data.ts --mode full --verbose

# Incremental update for specific series
pnpm exec jiti scripts/generate-star-trek-data.ts \
  --mode incremental \
  --series discovery \
  --verbose

# Dry run (preview changes)
pnpm exec jiti scripts/generate-star-trek-data.ts --dry-run --verbose

# Validate generated data
pnpm exec jiti scripts/validate-episode-data.ts --verbose
```

### Environment Setup

Create `.env` file in project root:

```bash
# TMDB API Read Access Token (Bearer token)
TMDB_API_KEY=your_api_key_here
```

**Note:** `.env` file is gitignored and should never be committed.

## Maintenance

### Regular Tasks

1. **Monthly:** Review merged automated PRs for data quality trends
2. **Quarterly:** Audit API key usage and rotate if necessary
3. **Annually:** Review and update workflow configuration
4. **As needed:** Adjust schedule frequency based on content release patterns

### Workflow Updates

When updating the workflow:

1. Test changes in a fork or feature branch first
2. Use workflow_dispatch trigger for testing
3. Enable dry-run mode to validate changes
4. Document changes in PR description
5. Review workflow logs after merge

## Related Documentation

- [Data Generation Guide](./data-generation.md) - Comprehensive CLI tool documentation
- [Environment Variables](./environment-variables.md) - API key configuration
- [Contributing Guidelines](../readme.md) - Development workflow
- [GitHub Actions Best Practices](.github/copilot-instructions.md) - Workflow security patterns

## Support

For issues or questions:

1. Check [existing issues](https://github.com/marcusrbrown/vbs/issues)
2. Review workflow logs for error details
3. Consult documentation and troubleshooting guide
4. Open new issue with workflow run link and error details
