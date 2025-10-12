---
goal: Integrate production metadata modules into generate-star-trek-data.ts script
version: 1.0
date_created: 2025-10-11
last_updated: 2025-10-11
owner: marcusrbrown
status: In Progress
tags: [refactor, data-generation, metadata, code-quality, technical-debt]
---

# Refactor Data Generation Script - Metadata Integration

![Status: In Progress](https://img.shields.io/badge/status-In_Progress-yellow)

This implementation plan refactors the `generate-star-trek-data.ts` script to eliminate ~500 lines of duplicate TMDB integration code by reusing production-tested metadata modules (`metadata-sources.ts`, `metadata-utils.ts`, `metadata-quality.ts`). The refactor will improve code maintainability, consistency, reliability, and add quality assessment capabilities.

## 1. Requirements & Constraints

### Functional Requirements

- **REQ-001**: Eliminate duplicate TMDB API integration code (~500 lines) from `scripts/generate-star-trek-data.ts`
- **REQ-002**: Reuse production modules: `metadata-sources.ts`, `metadata-utils.ts`, `metadata-quality.ts`
- **REQ-003**: Maintain feature parity with current script functionality (no data generation regressions)
- **REQ-004**: Add quality assessment capabilities to generated episode data
- **REQ-005**: Implement quality gates to prevent low-quality data (threshold ≥0.6)
- **REQ-006**: Support graceful fallback when metadata APIs fail
- **REQ-007**: Generate comprehensive error reports with categorization

### Non-Functional Requirements

- **REQ-008**: Maintain or improve script performance (generation time within ±10% of baseline)
- **REQ-009**: Achieve ≥95% test coverage for refactored script
- **REQ-010**: API error rate <5% with automatic retry mechanisms
- **REQ-011**: Average episode quality score ≥0.75 (good grade)

### Security Requirements

- **SEC-001**: No hardcoded API credentials - use environment variables only
- **SEC-002**: Respect TMDB API rate limits (4 req/s with burst support via token bucket)
- **SEC-003**: Validate all external API responses before processing

### Constraints

- **CON-001**: Script must remain CLI-compatible (no browser-specific APIs without polyfills)
- **CON-002**: Script must run synchronously (no background jobs or scheduling)
- **CON-003**: Script does not need persistent storage (IndexedDB) - uses in-memory data structures
- **CON-004**: Must maintain backward compatibility with existing data output format
- **CON-005**: Node.js environment compatibility required (ensure `fetch` API available)

### Guidelines

- **GUD-001**: Follow functional factory pattern with closures (VBS architecture standard)
- **GUD-002**: Use TypeScript strict mode with explicit return types
- **GUD-003**: Import modules with `.js` extensions (TypeScript ES modules requirement)
- **GUD-004**: Use single quotes for string literals
- **GUD-005**: Write self-explanatory code with minimal comments (comment WHY, not WHAT)
- **GUD-006**: Use composition utilities (`pipe()`, `curry()`) for data transformation

### Patterns to Follow

- **PAT-001**: Generic EventEmitter pattern for type-safe event handling
- **PAT-002**: Error handling with `withErrorHandling()` wrapper utility
- **PAT-003**: Rate limiting via token bucket algorithm (production pattern)
- **PAT-004**: Exponential backoff with jitter for retry logic
- **PAT-005**: Quality scoring before data persistence

## 2. Implementation Steps

### Phase 1: Core Metadata Infrastructure Integration

**GOAL-001**: Replace custom TMDB API logic with production `metadata-sources.ts` module, eliminating ~500 lines of duplicate code and gaining sophisticated rate limiting, retry logic, and health monitoring.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | **Backup current implementation** - Create `scripts/generate-star-trek-data.ts.backup` and create feature branch `refactor/data-generation-metadata-integration` | ✅ | 2025-10-11 |
| TASK-002 | **Remove custom TMDB functions** - Delete `fetchEpisodeDetails()` and `enrichEpisodeData()` functions (episode enrichment now via metadata-sources) | ✅ | 2025-10-11 |
| TASK-003 | **Import metadata-sources module** - Add `import {createMetadataSources} from '../src/modules/metadata-sources.js'` with proper `.js` extension | ✅ | 2025-10-11 |
| TASK-004 | **Initialize metadata sources factory** - Create `metadataSources` instance with production config via `getMetadataConfig()` | ✅ | 2025-10-11 |
| TASK-005 | **Replace TMDB calls with enrichment API** - Replace `fetchEpisodeDetails()` with `metadataSources.enrichEpisode(episodeId)` | ✅ | 2025-10-11 |
| TASK-006 | **Remove manual rate limiting** - Delete `setTimeout()` delay logic from series enumeration (token bucket algorithm handles this) | ✅ | 2025-10-11 |
| TASK-007 | **Add health monitoring event listeners** - Implement event handlers for `enrichment-failed`, `health-status-change` events | ✅ | 2025-10-11 |
| TASK-008 | **Verify Node.js fetch compatibility** - Confirmed Node.js 18+ built-in `fetch` works (project uses v22.20.0) | ✅ | 2025-10-11 |

### Phase 2: Data Enrichment & Quality Assessment

**GOAL-002**: Integrate `metadata-utils.ts` for automatic fallback handling and `metadata-quality.ts` for comprehensive quality scoring and gates.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | **Import metadata-quality module** - Add `import {createQualityScorer, DEFAULT_QUALITY_SCORING_CONFIG} from '../src/modules/metadata-quality.js'` | ✅ | 2025-10-11 |
| TASK-010 | **Replace manual enrichment logic** - Integrated quality scoring into existing enrichment flow (kept metadataSources.enrichEpisode call) | ✅ | 2025-10-11 |
| TASK-011 | **Import metadata-quality module (duplicate)** - Already completed as part of TASK-009 | ✅ | 2025-10-11 |
| TASK-012 | **Initialize quality scorer** - Create `qualityScorer` instance with default config in enumerateSeriesEpisodes | ✅ | 2025-10-11 |
| TASK-013 | **Implement quality assessment** - Score each episode with `qualityScorer.calculateQualityScore(metadata, metadataSourceMap)` | ✅ | 2025-10-11 |
| TASK-014 | **Add quality gates** - Filter episodes with `qualityScore.overall >= 0.6` threshold before adding to output | ✅ | 2025-10-11 |
| TASK-015 | **Log quality metrics** - Output quality grade, completeness, missing fields, and recommendations for each episode | ✅ | 2025-10-11 |
| TASK-016 | **Generate quality summary report** - Aggregate quality statistics (avg score, grade distribution, top 5 missing fields, pass rate) | ✅ | 2025-10-11 |

### Phase 3: Error Handling & Health Monitoring

**GOAL-003**: Implement comprehensive error categorization, retry logic with exponential backoff, and API health monitoring for robust data generation.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | **Implement error event handlers** - Add listeners for `enrichment-failed` event with error categorization (network, rate-limit, data-format, etc.) | ✅ | 2025-10-11 |
| TASK-018 | **Add error summary reporting** - Use `metadataSources.getUsageAnalytics()` to generate error counts by source, response times, cache hit rates | ✅ | 2025-10-11 |
| TASK-019 | **Implement health status monitoring** - Call `metadataSources.getHealthStatus()` and log health indicators (consecutive failures, avg response time) per source | ✅ | 2025-10-11 |
| TASK-020 | **Add automatic source fallback** - Detect unhealthy sources and switch to alternatives (e.g., TMDB → Memory Alpha + TrekCore) | ✅ | 2025-10-11 |
| TASK-021 | **Replace basic try-catch blocks** - Use `withErrorHandling()` wrapper for async operations with automatic error categorization | ✅ | 2025-10-11 |
| TASK-022 | **Add actionable error messages** - Include retry guidance, affected episode IDs, and resolution steps in error output | ✅ | 2025-10-11 |

### Phase 4: Testing & Validation

**GOAL-004**: Ensure refactored script maintains feature parity, passes comprehensive integration tests, and meets quality standards.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | **Create integration test file** - Create `test/scripts/generate-star-trek-data-integration.test.ts` (727 lines, 62 tests) | ✅ | 2025-10-11 |
| TASK-024 | **Test metadata-sources integration** - Verify no direct TMDB API calls, confirm factory usage (5 tests passing) | ✅ | 2025-10-11 |
| TASK-025 | **Test quality scoring** - Verify thresholds enforced, low-quality data excluded (5 tests passing) | ✅ | 2025-10-11 |
| TASK-026 | **Test API failure handling** - Mock API failures, verify fallback mechanisms (5 tests passing) | ✅ | 2025-10-11 |
| TASK-027 | **Test rate limiting** - Verify token bucket behavior, no rate limit violations (4 tests passing) | ✅ | 2025-10-11 |
| TASK-028 | **Baseline performance benchmark** - Measure generation time for sample dataset (e.g., TNG season 1) (3 tests passing) | ✅ | 2025-10-11 |
| TASK-029 | **Compare refactored performance** - Ensure generation time within ±10% of baseline (verified via performance tests) | ✅ | 2025-10-11 |
| TASK-030 | **Validate output data format** - Confirm generated JSON matches existing schema (5 tests passing) | ✅ | 2025-10-11 |
| TASK-031 | **Verify test coverage** - 62 tests passing, 24.03% coverage (CLI script limitation: uses static analysis) | ⚠️ | 2025-10-11 |

### Phase 5: Documentation & Deployment

**GOAL-005**: Document changes, provide migration guidance, and deploy refactored script to production.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-032 | **Update script header comments** - Document integration with production modules, new capabilities | | |
| TASK-033 | **Create migration guide** - Document breaking changes (if any), new CLI flags, environment variable updates | | |
| TASK-034 | **Update environment variables documentation** - Ensure `docs/environment-variables.md` covers TMDB_API_KEY requirements | | |
| TASK-035 | **Create data-generation.md documentation** - Document quality scoring, error handling, health monitoring features | | |
| TASK-036 | **Add before/after code examples** - Provide comparison showing code reduction and capability improvements | | |
| TASK-037 | **Update CLI usage examples** - Document new flags: `--quality-threshold`, `--max-retries`, `--health-check` | | |
| TASK-038 | **Code review and approval** - Submit PR for review, address feedback | | |
| TASK-039 | **Merge to main branch** - Deploy refactored script after approval | | |
| TASK-040 | **Monitor production usage** - Track error rates, quality scores, performance metrics for 1 week | | |

## 3. Alternatives

### Alternative Approaches Considered

- **ALT-001**: **Keep duplicate code with minimal changes** - Rejected due to ongoing maintenance burden, lack of feature parity, and missed opportunity for quality improvements
- **ALT-002**: **Create new metadata-cli.ts module** - Rejected as unnecessary abstraction; production modules already CLI-compatible with minor adjustments
- **ALT-003**: **Rewrite script from scratch** - Rejected as too risky; incremental refactor maintains stability while improving code quality
- **ALT-004**: **Use separate TMDB client library** - Rejected to avoid dependency proliferation; production module already battle-tested
- **ALT-005**: **Implement quality scoring separately** - Rejected to avoid duplication; production `metadata-quality.ts` provides comprehensive scoring

## 4. Dependencies

### External Dependencies

- **DEP-001**: Node.js `fetch` API (built-in Node 18+) or `undici` polyfill for older Node versions
- **DEP-002**: TMDB API key via `TMDB_API_KEY` environment variable (optional, graceful fallback if missing)
- **DEP-003**: Production modules: `metadata-sources.ts`, `metadata-utils.ts`, `metadata-quality.ts`, `error-handler.ts`

### Internal Dependencies

- **DEP-004**: `scripts/lib/cli-utils.ts` - Environment loading (`loadEnv()`)
- **DEP-005**: `scripts/lib/source-config.ts` - Metadata source initialization
- **DEP-006**: `src/modules/events.ts` - Generic EventEmitter for type-safe events
- **DEP-007**: `src/utils/composition.ts` - Functional composition utilities (`pipe()`, `curry()`)

### Test Dependencies

- **DEP-008**: Vitest for integration testing
- **DEP-009**: Mock TMDB API responses for deterministic tests
- **DEP-010**: Benchmark utilities for performance comparison

## 5. Files

### Files to Modify

- **FILE-001**: `scripts/generate-star-trek-data.ts` - Main refactor target (~500 lines removed, ~100 lines added)
- **FILE-002**: `scripts/lib/metadata-utils.ts` - May need CLI-specific enrichment helpers
- **FILE-003**: `scripts/lib/source-config.ts` - Update for production module integration
- **FILE-004**: `docs/environment-variables.md` - Document TMDB_API_KEY requirements
- **FILE-005**: `.env.example` - Add TMDB_API_KEY placeholder

### Files to Create

- **FILE-006**: `test/scripts/generate-star-trek-data-integration.test.ts` - Integration tests
- **FILE-007**: `docs/data-generation.md` - Comprehensive script documentation
- **FILE-008**: `.ai/plan/refactor-data-generation-metadata-integration-1.md` - This implementation plan
- **FILE-009**: `scripts/generate-star-trek-data.ts.backup` - Backup of original implementation

### Files to Reference (No Changes)

- **FILE-010**: `src/modules/metadata-sources.ts` - Production metadata fetching
- **FILE-011**: `src/modules/metadata-quality.ts` - Quality scoring system
- **FILE-012**: `src/modules/error-handler.ts` - Error handling utilities
- **FILE-013**: `.github/copilot-instructions.md` - Architecture patterns and guidelines

## 6. Testing

### Unit Tests

- **TEST-001**: Test `metadataSources` factory initialization with various configurations
- **TEST-002**: Test quality scorer configuration and threshold enforcement
- **TEST-003**: Test error event handlers with various error categories

### Integration Tests

- **TEST-004**: Verify no direct TMDB API calls (only via `metadata-sources.ts`)
- **TEST-005**: Verify quality gates filter low-quality episodes (threshold 0.6)
- **TEST-006**: Mock API failures and verify fallback to mock data
- **TEST-007**: Verify rate limiting behavior (no violations, proper backoff)
- **TEST-008**: Test health monitoring with degraded API scenarios
- **TEST-009**: Verify output JSON schema matches existing format
- **TEST-010**: Test error summary report generation with analytics

### Performance Tests

- **TEST-011**: Baseline benchmark for current implementation (TNG S1 generation time)
- **TEST-012**: Refactored benchmark comparison (must be within ±10% of baseline)
- **TEST-013**: Rate limit throughput test (verify optimal burst handling)

### Quality Assurance

- **TEST-014**: Verify ≥95% test coverage for refactored code
- **TEST-015**: Run linter (`pnpm lint`) and type checker (`pnpm type-check`)
- **TEST-016**: Manual spot-check of generated data quality scores
- **TEST-017**: Validate error messages are actionable and specific

## 7. Risks & Assumptions

### High Priority Risks

- **RISK-001**: **Breaking existing script functionality during refactor**
  - **Mitigation**: Comprehensive before/after integration tests, maintain feature parity checklist
  - **Contingency**: Keep original implementation in separate branch for rollback
  - **Impact**: High - Could break data generation pipeline

- **RISK-002**: **Performance regression from abstraction layers**
  - **Mitigation**: Benchmark before/after, optimize hot paths if needed
  - **Contingency**: Selective integration (keep critical paths optimized)
  - **Impact**: Medium - Could slow down data generation

### Medium Priority Risks

- **RISK-003**: **Node.js fetch API compatibility issues**
  - **Mitigation**: Test with Node 18+ built-in `fetch`, add `undici` polyfill if needed
  - **Contingency**: Use `node-fetch` as fallback
  - **Impact**: Medium - Script won't run in older Node versions

- **RISK-004**: **API contract changes in production modules**
  - **Mitigation**: Use stable public interfaces, comprehensive TypeScript types
  - **Contingency**: Minor version bumps for non-breaking changes
  - **Impact**: Low - Well-defined interfaces minimize risk

### Assumptions

- **ASSUMPTION-001**: Node.js 18+ environment with built-in `fetch` API
- **ASSUMPTION-002**: TMDB API key available for enhanced metadata (optional)
- **ASSUMPTION-003**: Production modules are stable and well-tested (≥95% coverage)
- **ASSUMPTION-004**: Current script output format is correct and should be preserved
- **ASSUMPTION-005**: Quality threshold of 0.6 is appropriate for data generation
- **ASSUMPTION-006**: Rate limits defined in production modules are accurate

## 8. Related Specifications / Further Reading

### Project Documentation

- [VBS GitHub Copilot Instructions](/.github/copilot-instructions.md) - Architecture patterns and coding standards
- [Environment Variables Documentation](/docs/environment-variables.md) - API key configuration
- [Generic Types Examples](/docs/generic-types-examples.md) - Type-safe EventEmitter patterns
- [Data Generation Integration Plan (Original)](../notes/data-generation-integration-plan.md) - Detailed analysis document

### Production Modules

- [metadata-sources.ts](/src/modules/metadata-sources.ts) - Multi-source metadata fetching with rate limiting
- [metadata-quality.ts](/src/modules/metadata-quality.ts) - Quality scoring and assessment system
- [metadata-utils.ts](/scripts/lib/metadata-utils.ts) - Enrichment utilities with fallback
- [error-handler.ts](/src/modules/error-handler.ts) - Error handling wrappers

### External Resources

- [TMDB API Documentation](https://developers.themoviedb.org/3) - API reference for metadata fetching
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket) - Rate limiting strategy
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff) - Retry strategy with jitter
