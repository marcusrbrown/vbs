# Star Trek Data Generation

Comprehensive guide to the `generate-star-trek-data.ts` script - an automated data generation pipeline that fetches, validates, and generates Star Trek episode and movie data using production-tested metadata modules.

## Overview

The data generation script creates the `src/data/star-trek-data.ts` file by fetching metadata from multiple sources, validating quality, and organizing content into chronological Star Trek eras. This script integrates with production metadata modules to ensure consistency, reliability, and comprehensive error handling.

### Key Features

- **Production Module Integration**: Leverages battle-tested `metadata-sources.ts`, `metadata-quality.ts`, and error handling modules
- **Multi-Source Fetching**: Aggregates data from TMDB, Memory Alpha, TrekCore, and STAPI with intelligent conflict resolution
- **Quality Assessment**: Comprehensive quality scoring with configurable thresholds (minimum: 0.6, target: 0.75)
- **Automatic Rate Limiting**: Token bucket algorithm prevents API quota violations (4 req/s for TMDB with burst support)
- **Error Tracking**: Categorizes errors by type (network, rate-limit, data-format) with detailed reporting
- **Health Monitoring**: Tracks API source health with automatic fallback to alternative sources
- **Chronological Organization**: Groups content into 7 Star Trek eras with proper timeline ordering
- **Type-Safe Output**: Generates TypeScript code with full type safety and validation

## Quick Start

### Prerequisites

1. **Node.js 18+** (built-in `fetch` API required)
2. **TMDB API Key** (optional but recommended):
   - Register at https://www.themoviedb.org/settings/api
   - Get API Read Access Token (Bearer token)
   - Set in `.env` file: `TMDB_API_KEY=your_key_here`

### Basic Usage

```bash
# Copy environment template
cp .env.example .env

# Add your TMDB API key to .env (optional)
# TMDB_API_KEY=your_key_here

# Full regeneration with validation
pnpm exec jiti scripts/generate-star-trek-data.ts --mode full --validate

# Incremental update for specific series
pnpm exec jiti scripts/generate-star-trek-data.ts --mode incremental --series discovery

# Dry run to preview changes
pnpm exec jiti scripts/generate-star-trek-data.ts --dry-run --verbose
```

## Production Module Integration

The script integrates with VBS production modules for consistency and reliability:

### Metadata Sources Module (`metadata-sources.ts`)

**Capabilities**:

- Multi-source metadata fetching (TMDB, Memory Alpha, TrekCore, STAPI)
- Token bucket rate limiting (4 req/s with burst support)
- Exponential backoff with jitter for retries
- Automatic source health monitoring
- Type-safe EventEmitter for enrichment tracking

**Integration Pattern**:

```typescript
import {createMetadataSources} from '../src/modules/metadata-sources.js'
import {getMetadataConfig} from './lib/source-config.js'

const metadataSources = createMetadataSources(getMetadataConfig())

// Enrich episode with metadata from all available sources
const metadata = await metadataSources.enrichEpisode(episodeId)

// Listen for enrichment events
metadataSources.on('enrichment-complete', ({episodeId, sources}) => {
  console.log(`Enriched ${episodeId} from sources: ${sources.join(', ')}`)
})
```

### Metadata Quality Module (`metadata-quality.ts`)

**Capabilities**:

- Comprehensive quality scoring (completeness, accuracy, reliability)
- Grade classification (excellent/good/acceptable/poor)
- Missing field analysis with recommendations
- Configurable thresholds and weight distribution

**Quality Metrics**:

- **Completeness** (40% weight): Percentage of required fields populated
- **Accuracy** (30% weight): Data validity and format correctness
- **Reliability** (30% weight): Source trustworthiness and consistency

**Integration Pattern**:

```typescript
import {createQualityScorer, DEFAULT_QUALITY_SCORING_CONFIG} from '../src/modules/metadata-quality.js'

const qualityScorer = createQualityScorer(DEFAULT_QUALITY_SCORING_CONFIG)

const qualityScore = qualityScorer.calculateQualityScore(metadata, source)

console.log(`Quality: ${qualityScore.overall.toFixed(2)} (${qualityScore.qualityGrade})`)
console.log(`Completeness: ${qualityScore.completeness.toFixed(2)}`)
console.log(`Missing fields: ${qualityScore.missingFields.join(', ')}`)
```

### Error Handling Module (`error-handler.ts`)

**Capabilities**:

- Consistent error boundaries with `withErrorHandling()` wrapper
- Automatic error categorization (network, rate-limit, data-format, etc.)
- Detailed error context with stack traces
- Graceful degradation on failures

**Integration Pattern**:

```typescript
import {withErrorHandling} from '../src/modules/error-handler.js'

const enrichWithErrorHandling = withErrorHandling(async (episodeId: string) => {
  return await metadataSources.enrichEpisode(episodeId)
})

const result = await enrichWithErrorHandling('tos_s1_e1')
```

## Quality Scoring System

### Quality Thresholds

The script enforces quality gates to ensure data completeness:

| Threshold | Score | Grade      | Meaning                                         |
| --------- | ----- | ---------- | ----------------------------------------------- |
| Minimum   | 0.6   | Acceptable | Data passes validation, suitable for generation |
| Target    | 0.75  | Good       | High-quality data with comprehensive metadata   |
| Excellent | 0.9+  | Excellent  | Nearly complete metadata from all sources       |
| Poor      | <0.6  | Poor       | Excluded from generation (quality gate failure) |

### Quality Components

**Completeness Score** (40% of overall):

- Required fields: title, season, episode, airDate
- Optional fields: synopsis, cast, director, writer, rating
- Scoring: `populated_fields / total_fields`

**Accuracy Score** (30% of overall):

- Valid date formats (ISO 8601)
- Proper episode numbering (season/episode integers)
- Title consistency across sources
- Rating ranges (0-10 for TMDB)

**Reliability Score** (30% of overall):

- Source priority: Memory Alpha > TMDB > TrekCore > STAPI
- Cross-source validation (conflicts resolved by priority)
- Data freshness (recent updates preferred)

### Quality Reports

The script generates comprehensive quality reports after generation:

```
Quality Summary Report:
  Total Episodes Processed: 726
  Average Quality Score: 0.82 (good)
  Grade Distribution:
    Excellent (0.9+): 245 episodes (33.7%)
    Good (0.75-0.9): 389 episodes (53.6%)
    Acceptable (0.6-0.75): 82 episodes (11.3%)
    Poor (<0.6): 10 episodes (1.4%)
  Pass Rate: 98.6%

Top Missing Fields:
  1. director: 234 episodes (32.2%)
  2. writer: 189 episodes (26.0%)
  3. guestStars: 156 episodes (21.5%)
  4. rating: 98 episodes (13.5%)
  5. productionCode: 67 episodes (9.2%)

Recommendations:
  - Consider additional sources for director information
  - Enable TMDB cast/crew fetching for better coverage
  - Memory Alpha scraping for guest star data
```

## Error Handling & Health Monitoring

### Error Categorization

Errors are automatically categorized for actionable reporting:

| Category | Description | Retry Strategy | Fallback |
| --- | --- | --- | --- |
| `network` | Connection failures, timeouts | Exponential backoff (3 retries) | Alternative source |
| `rate-limit` | API quota exceeded | Wait + exponential backoff | Queue for later |
| `data-format` | Invalid response structure | No retry | Use partial data |
| `not-found` | Episode/series not found | No retry | Skip with warning |
| `authentication` | Invalid API credentials | No retry | Disable source |
| `unknown` | Unexpected errors | 1 retry | Skip with error |

### Error Tracking

The script maintains comprehensive error tracking:

```typescript
interface ErrorTracker {
  bySource: Record<string, number>           // Error count per source
  byCategory: Record<string, number>         // Error count per category
  byEpisode: Map<string, string[]>           // Errors per episode
  total: number                              // Total error count
  details: {                           // Detailed error log
    episodeId: string
    source: string
    category: string
    message: string
    timestamp: Date
    retryCount: number
  }[]
}
```

### Health Monitoring

API source health is continuously monitored:

```typescript
interface HealthMonitor {
  sourceHealth: Record<string, {
    consecutiveFailures: number              // Failure streak
    totalRequests: number                    // Total requests made
    successfulRequests: number               // Successful responses
    averageResponseTime: number              // Avg response time (ms)
    isHealthy: boolean                       // Overall health status
    lastSuccessfulRequest: Date | null       // Last success timestamp
    lastError: string | null                 // Most recent error message
  }>
}
```

**Automatic Fallback**:

- If a source has 5+ consecutive failures, it's marked unhealthy
- Subsequent requests automatically use alternative sources
- Periodic health checks re-enable recovered sources

## Chronological Era Classification

Content is organized into 7 Star Trek eras based on in-universe timeline:

### Era Definitions

| Era ID | Title | Years | Stardates | Content |
| --- | --- | --- | --- | --- |
| `enterprise` | 22nd Century – Enterprise Era | 2151–2161 | Earth years | Enterprise series |
| `discovery_snw` | Mid-23rd Century – Discovery & SNW | 2256–2259 | Four-digit | Discovery S1-2, Strange New Worlds |
| `tos_era` | 23rd Century – Original Series Era | 2265–2293 | Four-digit | TOS, TAS, Movies I-VI |
| `tng_era` | 24th Century – Next Generation Era | 2364–2379 | Five-digit | TNG, DS9, VOY, Movies VII-X |
| `picard_era` | 25th Century – Picard Era | 2399–2401 | Five-digit | Picard, Lower Decks, Prodigy |
| `far_future` | 32nd Century – Far Future | 3188+ | Post-Burn | Discovery S3+ |
| `kelvin_timeline` | Kelvin Timeline | 2233–2263 (Alt) | Alternate | Kelvin movies (2009, Into Darkness, Beyond) |

### Special Cases

**Discovery Series Split**:

- Seasons 1-2: `discovery_snw` era (mid-23rd century)
- Seasons 3+: `far_future` era (32nd century post-Burn)

**Movie Classification**:

- TOS-era movies (TMP through TUC): `tos_era`
- TNG-era movies (Generations through Nemesis): `tng_era`
- Kelvin timeline movies: `kelvin_timeline`

## CLI Options Reference

### Core Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--mode <mode>` | string | `full` | Generation mode: `full` (complete regeneration) or `incremental` (update changed content) |
| `--series <series>` | string | all | Target specific series (e.g., `tos`, `tng`, `ds9`) |
| `--dry-run` | boolean | `false` | Preview changes without writing files |
| `--output <path>` | string | `src/data/star-trek-data.ts` | Output file path |
| `--validate` | boolean | `true` | Run validation after generation |
| `--verbose` | boolean | `false` | Enable detailed logging |
| `--help` | boolean | - | Show help message |

### Future Options (Planned)

These flags are planned for future implementation:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `--quality-threshold <score>` | number | `0.6` | Minimum quality score (0-1) for inclusion |
| `--max-retries <count>` | number | `3` | Maximum retry attempts for failed requests |
| `--health-check` | boolean | `false` | Run health check on all sources before generation |

## Environment Variables

### Required Variables

None - all variables are optional with graceful fallbacks.

### Optional Variables

| Variable | Type | Default | Description |
| --- | --- | --- | --- |
| `TMDB_API_KEY` | string | - | TMDB API Read Access Token (enables enhanced metadata) |
| `DEBUG` | boolean | `false` | Enable verbose debug logging |
| `MIN_METADATA_QUALITY` | number | `0.6` | Minimum quality threshold (0-1 scale) |
| `TMDB_RATE_LIMIT` | number | `30` | TMDB requests per minute |
| `MEMORY_ALPHA_RATE_LIMIT` | number | `60` | Memory Alpha requests per minute |

See [Environment Variables Documentation](./environment-variables.md) for detailed configuration guide.

## Data Flow Pipeline

### 1. Discovery Phase

**Series Discovery**:

```
Search TMDB for known series
  ↓
Fetch series details (ID, seasons, episode count)
  ↓
Store discovered series metadata
```

**Movie Discovery**:

```
Search TMDB for known movies
  ↓
Fetch movie details (ID, release date, runtime)
  ↓
Fetch movie credits (director, writers, cast)
  ↓
Store discovered movie metadata
```

### 2. Enrichment Phase

**Episode Enrichment**:

```
For each series season:
  Fetch season details from TMDB
    ↓
  For each episode:
    Call metadataSources.enrichEpisode(episodeId)
      ↓
    Aggregate data from all sources:
      - TMDB: cast, crew, ratings, official images
      - Memory Alpha: canonical plot, production notes
      - TrekCore: screenshots, promotional images
      - STAPI: character database, cross-references
    ↓
    Merge with conflict resolution (Memory Alpha > TMDB > TrekCore > STAPI)
      ↓
    Calculate quality score
      ↓
    Apply quality gate (score >= 0.6)
      ↓
    Add to normalized output
```

### 3. Normalization Phase

**Data Transformation**:

```
Transform enriched data to VBS format:
  - Generate VBS-compatible IDs (e.g., 'tng_s3_e15')
  - Extract stardate and year from metadata
  - Normalize titles and descriptions
  - Format cast/crew lists
  - Apply episode-level quality indicators
```

### 4. Classification Phase

**Era Grouping**:

```
Group normalized items by chronological era:
  - Classify series by code (tos, tng, etc.)
  - Classify movies by ID (tmp, fc, st2009, etc.)
  - Handle special cases (Discovery split)
  - Sort items within eras by in-universe timeline
```

### 5. Code Generation Phase

**TypeScript Generation**:

```
Generate star-trek-data.ts:
  - Import statements and type definitions
  - Export era array with type safety
  - Format with Prettier/ESLint
  - Add header comments with generation metadata
  - Write to output file
```

### 6. Validation Phase

**Post-Generation Validation**:

```
Run validate-episode-data.ts:
  - Verify structure and types
  - Check ID uniqueness
  - Validate stardate formats
  - Ensure chronological ordering
  - Report validation errors
```

## Testing & Validation

### Manual Testing

```bash
# Test with single series
pnpm exec jiti scripts/generate-star-trek-data.ts --series tos --verbose

# Dry run to preview without writing
pnpm exec jiti scripts/generate-star-trek-data.ts --dry-run

# Test incremental mode
pnpm exec jiti scripts/generate-star-trek-data.ts --mode incremental --series discovery
```

### Automated Testing

The script has comprehensive integration tests:

```bash
# Run integration test suite
pnpm test test/scripts/generate-star-trek-data-integration.test.ts

# Test coverage
pnpm test:coverage
```

**Test Coverage** (62 tests):

- Metadata source integration (no direct TMDB calls)
- Quality scoring and threshold enforcement
- API failure handling and fallback
- Rate limiting behavior (token bucket)
- Performance benchmarks
- Output data format validation

### Validation Tools

**Post-Generation Validation**:

```bash
# Validate generated data structure
pnpm exec jiti scripts/validate-episode-data.ts

# Shows:
# - Structure validation
# - ID uniqueness checks
# - Stardate format verification
# - Chronological ordering
# - Missing required fields
```

## Troubleshooting

### Common Issues

#### TMDB API Not Working

**Symptoms**: `TMDB: ✗ Not configured` in source status

**Solutions**:

1. Verify `TMDB_API_KEY` in `.env` file
2. Check API key is valid at https://www.themoviedb.org/settings/api
3. Ensure `.env` file is in project root (not `scripts/`)
4. Restart script after updating `.env`

#### Rate Limit Errors

**Symptoms**: `rate-limit` errors in output, slow generation

**Solutions**:

1. Increase `TMDB_RATE_LIMIT` in `.env` (default: 30/min)
2. Use `--verbose` to see rate limiting in action
3. Script automatically backs off - just wait
4. Check TMDB quota at API dashboard

#### Low Quality Scores

**Symptoms**: Many episodes with quality < 0.6, high exclusion rate

**Solutions**:

1. Enable TMDB API key for better metadata
2. Check Memory Alpha availability (primary source)
3. Review missing fields in quality report
4. Lower `MIN_METADATA_QUALITY` threshold if acceptable

#### Health Check Failures

**Symptoms**: Sources marked unhealthy, automatic fallback triggered

**Solutions**:

1. Check internet connection
2. Verify API service status (TMDB status page)
3. Wait for automatic health recovery (periodic checks)
4. Use `--verbose` to see health status updates

#### Generation Takes Too Long

**Symptoms**: Script runs for hours, slow progress

**Solutions**:

1. Use `--series <series>` to generate one series at a time
2. Use `--mode incremental` to update only changed content
3. Check rate limiting isn't too aggressive
4. Consider network bandwidth/latency

### Debug Mode

Enable comprehensive debug logging:

```bash
# Enable debug in environment
DEBUG=true pnpm exec jiti scripts/generate-star-trek-data.ts --verbose

# Shows:
# - API request/response details
# - Rate limiting calculations
# - Quality scoring breakdowns
# - Error categorization logic
# - Health monitoring status
```

## Performance Optimization

### Rate Limiting Strategy

**Token Bucket Algorithm**:

- Capacity: 10 tokens (allows bursts)
- Refill rate: 4 tokens/second (240/minute)
- TMDB quota: 40 req/10s = 4 req/s
- Automatic backoff on rate limit errors

### Caching Strategy

**Memory Alpha Cache**:

- In-memory cache during generation
- Reduces redundant scraping
- Cleared between runs

**TMDB Cache**:

- Uses metadata-sources built-in cache
- Respects HTTP cache headers
- Reduces API calls for unchanged data

### Incremental Mode

Use `--mode incremental` to update only changed content:

```bash
pnpm exec jiti scripts/generate-star-trek-data.ts --mode incremental --series discovery
```

**Incremental Benefits**:

- Faster generation (only changed episodes)
- Preserves existing quality scores
- Reduces API quota usage
- Ideal for adding new episodes

## Before/After Comparison

### Code Reduction

**Before Refactor** (duplicate TMDB integration):

- Total lines: ~2,500 lines
- Custom TMDB functions: ~500 lines
- Manual rate limiting: ~50 lines
- Basic error handling: ~100 lines
- No quality scoring: 0 lines
- No health monitoring: 0 lines

**After Refactor** (production module integration):

- Total lines: ~2,100 lines (-400 lines, -16%)
- Production module imports: ~10 lines
- Automatic rate limiting: 0 lines (module handles)
- Comprehensive error tracking: ~50 lines
- Quality assessment: ~80 lines
- Health monitoring: ~30 lines

**Net Result**: 500 lines of duplicate code eliminated, replaced with 170 lines of production-quality integration code.

### Capability Improvements

| Feature             | Before          | After                                             |
| ------------------- | --------------- | ------------------------------------------------- |
| Metadata sources    | TMDB only       | TMDB + Memory Alpha + TrekCore + STAPI            |
| Rate limiting       | Manual delays   | Token bucket with burst support                   |
| Error handling      | Basic try-catch | Categorized with retry logic                      |
| Quality scoring     | None            | Comprehensive (completeness/accuracy/reliability) |
| Health monitoring   | None            | Automatic with fallback                           |
| Retry logic         | None            | Exponential backoff with jitter                   |
| Event tracking      | None            | Type-safe EventEmitter                            |
| Conflict resolution | N/A             | Priority-based merging                            |

## Future Enhancements

### Planned Features

1. **Additional CLI flags**:
   - `--quality-threshold <score>`: Override minimum quality threshold
   - `--max-retries <count>`: Configure retry attempts
   - `--health-check`: Pre-generation health verification

2. **Enhanced metadata sources**:
   - Wikipedia for broader context
   - Fan wikis for detailed production info
   - Official CBS/Paramount APIs (if available)

3. **Advanced quality features**:
   - Automatic quality improvement suggestions
   - Source reliability scoring over time
   - Quality trend analysis

4. **Performance optimizations**:
   - Parallel episode fetching (respecting rate limits)
   - Persistent metadata cache across runs
   - Incremental quality recalculation

## References

### Internal Documentation

- [Environment Variables](./environment-variables.md) - Configuration guide
- [VBS Architecture](../.github/copilot-instructions.md) - Code patterns and standards
- [Generic Types Examples](./generic-types-examples.md) - EventEmitter patterns
- [Metadata Storage Integration](./metadata-storage-integration.md) - Metadata system overview

### External Resources

- [TMDB API Documentation](https://developers.themoviedb.org/3) - API reference
- [Memory Alpha](https://memory-alpha.fandom.com/wiki/Portal:Main) - Star Trek wiki
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket) - Rate limiting
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff) - Retry strategy

### Related Scripts

- `scripts/validate-episode-data.ts` - Data validation utility
- `scripts/lib/source-config.ts` - Metadata source configuration
- `scripts/lib/cli-utils.ts` - CLI utility functions
- `scripts/lib/data-validation.ts` - Validation rules
- `scripts/lib/code-generation.ts` - TypeScript code generation
