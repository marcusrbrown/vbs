# ADR: Automated Star Trek Data Generation Architecture

**Status**: Accepted  
**Date**: 2025-10-13  
**Decision Makers**: Marcus R. Brown  
**Related Issues**: #250, #249, #248, #247, #246  
**Implementation**: `scripts/generate-star-trek-data.ts`

## Context

VBS (View By Stardate) requires comprehensive Star Trek episode and movie data organized chronologically for users to track viewing progress. Originally, this data was manually maintained in `src/data/star-trek-data.ts`. As the Star Trek universe expands with new series and content, manual updates became time-consuming, error-prone, and difficult to scale.

### Problems with Manual Data Management

1. **Scalability**: New episodes and series require constant manual updates
2. **Error-Prone**: Manual entry leads to typos, inconsistent formatting, missing data
3. **Incomplete Metadata**: Difficult to manually gather comprehensive metadata from multiple sources
4. **Quality Inconsistency**: No systematic validation of data completeness and accuracy
5. **Time-Consuming**: Significant developer effort required for routine data updates
6. **Staleness**: Data falls out of date quickly without continuous manual maintenance

### Requirements

- **REQ-001**: Automate data fetching from authoritative sources (TMDB, Memory Alpha, TrekCore, STAPI)
- **REQ-002**: Ensure data quality through systematic validation and scoring
- **REQ-003**: Maintain backward compatibility with existing VBS codebase
- **REQ-004**: Generate type-safe TypeScript code with proper formatting
- **REQ-005**: Support incremental updates to preserve manual annotations
- **REQ-006**: Respect API rate limits and handle failures gracefully
- **REQ-007**: Integrate with existing VBS metadata infrastructure

## Decision

Implement an **automated data generation pipeline** using a CLI script that:

1. **Leverages existing production modules** (`metadata-sources.ts`, `metadata-quality.ts`, `error-handler.ts`)
2. **Aggregates data from multiple sources** with intelligent conflict resolution
3. **Validates and scores data quality** using comprehensive metrics
4. **Generates type-safe TypeScript code** matching existing data structures
5. **Supports both full regeneration and incremental update modes**
6. **Includes comprehensive error handling and health monitoring**

### Architecture Components

#### 1. Production Module Integration

**Decision**: Reuse battle-tested VBS production modules rather than reimplementing functionality.

**Rationale**:

- `metadata-sources.ts` already implements reliable multi-source fetching with rate limiting
- `metadata-quality.ts` provides proven quality scoring algorithms
- `error-handler.ts` offers consistent error boundaries and tracking
- Reduces code duplication and maintenance burden
- Ensures consistency between runtime app and build-time generation

**Implementation Pattern**:

```typescript
import {withErrorHandling} from '../src/modules/error-handler.js'
import {createQualityScorer} from '../src/modules/metadata-quality.js'
import {createMetadataSources} from '../src/modules/metadata-sources.js'

// Use production modules with script-specific configuration
const metadataSources = createMetadataSources(getMetadataConfig())
const qualityScorer = createQualityScorer(DEFAULT_QUALITY_SCORING_CONFIG)
```

#### 2. Multi-Source Data Aggregation

**Decision**: Fetch metadata from multiple sources and merge with priority-based resolution.

**Source Priority**:

1. **Memory Alpha** (priority: 3) - Canon Star Trek wiki, most authoritative for in-universe data
2. **TMDB** (priority: 2) - Reliable for production metadata, ratings, images
3. **TrekCore/STAPI** (priority: 1) - Supplementary sources for additional context

**Rationale**:

- No single source provides complete, accurate metadata
- Memory Alpha excels at canon information (stardates, plot summaries)
- TMDB excels at production metadata (air dates, episode titles, cast)
- Conflict resolution based on source trust level and completeness scoring

**Conflict Resolution Strategy**:

```typescript
export function resolveConflict(
  sources: {value: any; source: string; priority: number}[]
): any {
  // 1. Prioritize by configured source priority
  // 2. Break ties using completeness scoring
  // 3. Fallback to first non-null value
}
```

#### 3. Quality Scoring System

**Decision**: Implement comprehensive quality assessment before accepting generated data.

**Quality Metrics** (weighted scores):

- **Completeness** (40%): Percentage of required fields populated
- **Accuracy** (30%): Data validity (correct formats, reasonable values)
- **Reliability** (30%): Source trustworthiness and consistency

**Quality Thresholds**:

- **Minimum**: 0.6 (reject below this)
- **Target**: 0.75 (warn if below, accept if above minimum)
- **Excellent**: 0.9+ (high-quality data)

**Rationale**:

- Prevents low-quality data from degrading user experience
- Provides actionable feedback on data issues
- Enables gradual quality improvements over time

#### 4. TypeScript Code Generation

**Decision**: Generate TypeScript code (not JSON) matching existing `star-trek-data.ts` structure.

**Rationale**:

- Maintains backward compatibility with existing VBS codebase
- Enables type checking at build time (catches errors early)
- Supports code comments and manual annotations
- Git-friendly diffs for code review

**Generation Pattern**:

```typescript
// Generate type-safe TypeScript code
const generatedCode = `
export const starTrekData: StarTrekEra[] = [
  {
    id: 'enterprise',
    title: '22nd Century – Enterprise Era',
    items: [
      // Generated episode data
    ]
  }
]
`
```

#### 5. Incremental Update Mode

**Decision**: Support incremental updates that preserve manual edits and custom annotations.

**Implementation**:

- Parse existing `star-trek-data.ts` to detect manual annotations
- Merge new data with existing structure
- Preserve custom fields (e.g., `customNotes`, `spoilerLevel`)
- Only update fields that have changed from authoritative sources

**Rationale**:

- Enables manual corrections and curations without losing data on regeneration
- Supports gradual migration from manual to automated data
- Allows domain experts to add context not available from APIs

#### 6. Error Handling & Health Monitoring

**Decision**: Comprehensive error categorization with source health tracking.

**Error Categories**:

- `network`: Connection failures, timeouts
- `rate-limit`: API quota exceeded
- `auth`: Authentication/authorization failures
- `data-format`: Malformed API responses
- `validation`: Data quality failures

**Health Monitoring**:

- Track success/failure rates per source
- Automatic degradation to backup sources
- Detailed error reporting for troubleshooting

**Rationale**:

- APIs fail unpredictably in production
- Health tracking enables proactive issue detection
- Graceful degradation maintains availability

## Alternatives Considered

### Alternative 1: Runtime Data Fetching

**Approach**: Fetch metadata at runtime in the browser.

**Rejected Because**:

- CORS restrictions limit API access from browsers
- API rate limits inadequate for all users
- Offline functionality compromised
- Slower initial page load

### Alternative 2: Manual Data Entry with Validation

**Approach**: Continue manual updates but add validation tools.

**Rejected Because**:

- Doesn't solve scalability problem
- Still time-consuming and error-prone
- Validation can't fix incomplete data

### Alternative 3: Third-Party Star Trek API Service

**Approach**: Use a dedicated Star Trek API as single source of truth.

**Rejected Because**:

- Reliability concerns (single point of failure)
- Cost considerations
- Limited control over data quality and updates
- Desire for data ownership

### Alternative 4: Database Backend with CMS

**Approach**: Build admin interface for data management with database storage.

**Rejected Because**:

- Violates local-first architecture principle
- Introduces hosting costs and infrastructure complexity
- Reduces portability (GitHub Pages, static hosting)
- Over-engineered for current scale

### Alternative 5: Web Scraping Only

**Approach**: Scrape Memory Alpha and other wikis without API access.

**Rejected Because**:

- Fragile (breaks when HTML structure changes)
- Legal and ethical concerns
- Higher maintenance burden
- Slower than API access

## Consequences

### Positive

1. **Automated Updates**: New content added automatically without manual effort
2. **Higher Quality**: Systematic validation ensures data completeness and accuracy
3. **Scalability**: Handles growing Star Trek content effortlessly
4. **Multi-Source Reliability**: Falls back to alternative sources when APIs fail
5. **Type Safety**: TypeScript generation catches errors at build time
6. **Maintainability**: Reuses production modules for consistency
7. **Incremental Mode**: Preserves manual curations and annotations
8. **Transparency**: Quality scores and validation reports make issues visible

### Negative

1. **API Dependency**: Script requires active TMDB API key (mitigated: optional)
2. **Complexity**: More moving parts than manual data entry
3. **Build Time**: Data generation adds overhead to update workflow
4. **Conflict Resolution**: Priority system may not always choose "best" data

### Neutral

1. **Learning Curve**: Developers must understand data generation pipeline
2. **Testing Burden**: Comprehensive tests needed to ensure reliability (addressed in Phase 5)
3. **GitHub Actions**: Eventual automation requires CI/CD setup (planned for Phase 6)

## Implementation Phases

### Phase 1: Shared Utilities (COMPLETED)

- Extracted reusable modules from `validate-episode-data.ts`
- Created `scripts/lib/` utilities for CLI, file operations, code generation

### Phase 2: Core Generation (COMPLETED)

- Implemented `generate-star-trek-data.ts` with full pipeline
- Integrated with production metadata modules
- Added quality scoring and validation

### Phase 3: Data Quality & Validation (COMPLETED)

- Comprehensive validation integration
- Quality thresholds and scoring
- Conflict resolution strategies

### Phase 4: GitHub Actions Workflow (COMPLETED)

- Automated weekly data update workflow
- PR creation with detailed changelogs
- Manual workflow dispatch for on-demand updates

### Phase 5: Testing & Documentation (IN PROGRESS)

- Comprehensive test suite (63 tests, 100% pass rate) ✅
- Usage documentation (`docs/data-generation.md`) ✅
- Architecture Decision Record (this document) ✅
- Troubleshooting guides (in `docs/data-generation.md`) ✅

### Phase 6: Advanced Features (PLANNED)

- Parallel data fetching
- Caching layer
- Configuration file
- Plugin system

## References

### Internal Documentation

- [Data Generation Guide](../data-generation.md)
- [Environment Variables](../environment-variables.md)
- Implementation Plan: `.ai/plan/feature-automated-data-generation-1.md`

### Related Issues

- # 250: Phase 5 - Testing & Documentation
- # 249: Phase 4 - GitHub Actions Workflow
- # 248: Phase 3 - Data Quality & Validation
- # 247: Phase 2 - Core Generation
- # 246: Phase 1 - Shared Utilities

### External Resources

- [TMDB API Documentation](https://developers.themoviedb.org/3)
- [Memory Alpha](https://memory-alpha.fandom.com)
- [STAPI](https://stapi.co/)

## Review History

- **2025-10-13**: Initial ADR created (Phase 5)
- **Future**: Plan review after Phase 6 advanced features implementation
