# Environment Variable Configuration

VBS uses environment variables for API credentials and script configuration, managed through the `dotenv` package in development environments.

## Quick Start

1. **Copy the example file**:

   ```bash
   cp .env.example .env
   ```

2. **Add your API keys**: Edit `.env` and replace placeholder values with your actual credentials.

3. **Run scripts**: Environment variables are automatically loaded when running CLI scripts:
   ```bash
   pnpm exec jiti scripts/validate-episode-data.ts
   ```

## Supported Environment Variables

### Metadata API Keys

#### `TMDB_API_KEY`

- **Description**: The Movie Database (TMDB) API key for enhanced episode metadata
- **Required**: No (gracefully falls back to other sources)
- **Format**: String (32-character hexadecimal)
- **Get API Key**: https://www.themoviedb.org/settings/api
- **Usage**: Provides cast information, ratings, official images, and production details
- **Example**: `TMDB_API_KEY=a1b2c3d4e5f6789012345678901234ab`

### Public API Sources (No Authentication Required)

The following sources are automatically available without API keys:

- **Memory Alpha**: Star Trek Wiki for canonical episode information
- **TrekCore**: Media repository for screenshots and promotional images
- **STAPI**: Comprehensive Star Trek API for character and episode data

### Future Integrations (Reserved)

The following variables are reserved for planned features:

- `TVDB_API_KEY`: TheTVDB API key
- `TRAKT_CLIENT_ID`: Trakt.tv client ID
- `TRAKT_CLIENT_SECRET`: Trakt.tv client secret

### Script Configuration

#### `DEBUG`

- **Description**: Enable verbose debug logging
- **Default**: `false`
- **Values**: `true` | `false`
- **Example**: `DEBUG=true`

#### `MIN_METADATA_QUALITY`

- **Description**: Minimum acceptable quality score (0-1 scale)
- **Default**: `0.6` (60% complete)
- **Values**: Number between 0 and 1
- **Example**: `MIN_METADATA_QUALITY=0.8`

#### `TMDB_RATE_LIMIT`

- **Description**: Rate limit for TMDB API requests (per minute)
- **Default**: `30`
- **Values**: Positive integer
- **Example**: `TMDB_RATE_LIMIT=40`

#### `MEMORY_ALPHA_RATE_LIMIT`

- **Description**: Rate limit for Memory Alpha requests (per minute)
- **Default**: `60`
- **Values**: Positive integer
- **Example**: `MEMORY_ALPHA_RATE_LIMIT=100`

## Usage in Scripts

### Loading Environment Variables

All CLI scripts automatically load environment variables using the `loadEnv()` utility from `scripts/lib/cli-utils.ts`:

```typescript
import {loadEnv} from './lib/cli-utils.js'

// Load .env file (optional - silently continues if not found)
loadEnv()

// Or with verbose logging
loadEnv({verbose: true})

// Or require .env file (exits with error if missing)
loadEnv({required: true})
```

### Accessing Environment Variables

After loading, access variables through `process.env`:

```typescript
const tmdbApiKey = process.env.TMDB_API_KEY

if (tmdbApiKey) {
  console.log('TMDB API key is configured')
} else {
  console.log('TMDB API key not found, using fallback sources')
}
```

### Graceful Fallback Pattern

VBS scripts are designed to work with or without API keys:

```typescript
import {initializeMetadataSources, logMetadataSourceStatus} from './lib/source-config.js'

// Automatically detects available credentials and configures sources
const metadataSources = initializeMetadataSources()

// Logs which sources are available
logMetadataSourceStatus()
```

Output example:

```
Metadata Source Status:
  TMDB: ✓ Available
  Memory Alpha: ✓ Available
  TrekCore: ✓ Available
  STAPI: ✓ Available
```

Or without TMDB key:

```
Metadata Source Status:
  TMDB: ✗ Not configured (TMDB_API_KEY missing)
  Memory Alpha: ✓ Available
  TrekCore: ✓ Available
  STAPI: ✓ Available
```

## Security Best Practices

### Development

1. **Never commit `.env` files**: The `.gitignore` file is pre-configured to exclude all `.env*` files
2. **Use `.env.example` for documentation**: Update `.env.example` when adding new variables
3. **Rotate API keys regularly**: Especially if they may have been exposed
4. **Use minimal permissions**: Request only the access levels your scripts need

### Production

1. **Use environment variables directly**: Set variables through your deployment platform
2. **Use secrets management**: For sensitive production credentials, use secure vaults (AWS Secrets Manager, Azure Key Vault, etc.)
3. **Validate required variables**: Check for required credentials at runtime
4. **Never log API keys**: Sanitize logs to prevent credential exposure

## Troubleshooting

### `.env` file not loading

**Problem**: Environment variables from `.env` aren't being used

**Solutions**:

1. Verify `.env` file exists in project root: `ls -la .env`
2. Check file syntax (no spaces around `=`): `TMDB_API_KEY=value` not `TMDB_API_KEY = value`
3. Enable verbose logging: `loadEnv({verbose: true})`
4. Verify the script calls `loadEnv()` before accessing variables

### TMDB API not working

**Problem**: `TMDB: ✗ Not configured` despite setting `TMDB_API_KEY`

**Solutions**:

1. Verify API key format (32 hex characters): `echo $TMDB_API_KEY`
2. Check for leading/trailing whitespace in `.env`
3. Ensure `.env` is in the project root (not in `scripts/`)
4. Restart the script after updating `.env`
5. Validate API key at https://www.themoviedb.org/settings/api

### Permission errors

**Problem**: `Error: EACCES: permission denied` when reading `.env`

**Solutions**:

1. Check file permissions: `ls -l .env`
2. Fix permissions: `chmod 600 .env` (owner read/write only)
3. Verify ownership: `ls -l .env` and compare with `whoami`

## Testing with Environment Variables

### Unit Tests

When testing code that depends on environment variables:

```typescript
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

describe('Metadata API Integration', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = {...process.env}
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  it('should use TMDB when API key is configured', () => {
    process.env.TMDB_API_KEY = 'test-key-123'
    // Test code
  })

  it('should fallback when API key is missing', () => {
    delete process.env.TMDB_API_KEY
    // Test code
  })
})
```

### Integration Tests

For end-to-end testing with real APIs:

1. Create `.env.test` with test credentials
2. Load it explicitly in test setup:
   ```typescript
   import {config} from 'dotenv'
   config({path: '.env.test'})
   ```
3. Use rate-limited test keys to avoid quota exhaustion

## Adding New Environment Variables

When adding new configuration options:

1. **Update `.env.example`**:

   ```bash
   # New API Key Description
   # Get your key at: https://example.com/api
   NEW_API_KEY=your_key_here
   ```

2. **Document in this file**: Add a section describing the variable's purpose, format, and usage

3. **Update `source-config.ts`**: Add loading and validation logic

   ```typescript
   export const loadApiConfigFromEnv = (): ApiConfig => {
     return {
       tmdbApiKey: process.env.TMDB_API_KEY,
       newApiKey: process.env.NEW_API_KEY, // Add here
     }
   }
   ```

4. **Add to validation**: Include in `validateApiCredentials()` if required

5. **Update tests**: Add test cases for the new variable

## References

- **dotenv documentation**: https://github.com/motdotla/dotenv
- **TMDB API documentation**: https://developers.themoviedb.org/3
- **Memory Alpha**: https://memory-alpha.fandom.com/wiki/Portal:Main
- **STAPI**: http://stapi.co/
- **VBS Source Configuration**: `scripts/lib/source-config.ts`
- **VBS CLI Utilities**: `scripts/lib/cli-utils.ts`
