---
goal: Automated Star Trek Data Generation with Metadata Source Integration
version: 1.0
date_created: 2025-10-11
last_updated: 2025-10-12
owner: Marcus R. Brown
status: 'In Progress'
tags: ['feature', 'automation', 'data-generation', 'metadata', 'github-actions', 'cli-tools']
---

# Automated Star Trek Data Generation Implementation Plan

![Status: In Progress](https://img.shields.io/badge/status-In_Progress-yellow)

This plan implements an automated system to fetch series, movie, and episode data using the existing metadata sources infrastructure and generate the `star-trek-data.ts` file programmatically. The system includes a CLI tool for data generation, validation, and a GitHub Actions workflow that periodically updates the data file and creates pull requests with the changes. This builds upon the completed metadata enrichment system and validation tools to ensure data accuracy and consistency.

## 1. Requirements & Constraints

- **REQ-001**: Create TypeScript CLI script (`scripts/generate-star-trek-data.ts`) that generates `src/data/star-trek-data.ts` from metadata sources
- **REQ-002**: Reuse metadata source integrations from existing `src/modules/metadata-sources.ts` (Memory Alpha, TMDB, TrekCore, STAPI)
- **REQ-003**: Extract and modularize reusable components from `scripts/validate-episode-data.ts` into shared utilities
- **REQ-004**: Implement comprehensive data generation pipeline: fetch → normalize → validate → format → write
- **REQ-005**: Support incremental updates and full regeneration modes to handle both new content and corrections
- **REQ-006**: Integrate with existing validation tools to ensure generated data meets quality standards
- **REQ-007**: Create GitHub Actions workflow that runs periodically (weekly) to check for data updates
- **REQ-008**: Implement PR creation workflow with detailed changelogs showing what data was added/modified
- **REQ-009**: Include automated validation checks in PR workflow before merging data updates
- **REQ-010**: Support manual workflow dispatch for on-demand data updates and testing
- **REQ-011**: Maintain backward compatibility with existing `star-trek-data.ts` structure and consumer code
- **REQ-012**: Generate TypeScript code with proper formatting (Prettier/ESLint compliant)
- **REQ-013**: Include metadata provenance tracking (which source provided which data) for auditing
- **REQ-014**: Support dry-run mode for testing data generation without file writes
- **REQ-015**: Implement conflict resolution when multiple sources provide contradictory information
- **SEC-001**: Secure API credentials in GitHub Actions using repository secrets
- **SEC-002**: Validate and sanitize all external data before code generation to prevent code injection
- **SEC-003**: Implement rate limiting to respect API quotas and avoid service disruptions
- **SEC-004**: Review generated PRs for data quality issues before auto-merge (require human approval)
- **CON-001**: Generated file must remain human-readable and git-friendly for code review
- **CON-002**: Data generation must complete within GitHub Actions timeout limits (max 6 hours)
- **CON-003**: Script must handle API failures gracefully and use cached/partial data when necessary
- **CON-004**: Generated data size must remain reasonable (<2MB uncompressed) for browser loading
- **CON-005**: Must not break existing episode tracking, progress data, or visualization features
- **GUD-001**: Follow functional factory patterns and TypeScript strict mode throughout
- **GUD-002**: Use composition utilities for data transformation pipelines
- **GUD-003**: Maintain self-explanatory code with minimal comments (explain WHY, not WHAT)
- **GUD-004**: Include comprehensive error handling and logging for debugging
- **PAT-001**: Use template-based code generation for consistent TypeScript output
- **PAT-002**: Implement data normalization pipeline with configurable transformation rules
- **PAT-003**: Use functional composition for data fetching, merging, and validation stages
- **PAT-004**: Apply GitHub Actions best practices (caching, matrix strategies, security hardening)

## 2. Implementation Steps

### Implementation Phase 1: Extract Shared Utilities

- GOAL-001: Modularize reusable components from validation script into shared utilities library

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `scripts/lib/metadata-utils.ts` with shared metadata fetching and normalization functions extracted from `validate-episode-data.ts` | ✅ | 2025-10-11 |
| TASK-002 | Create `scripts/lib/data-validation.ts` with reusable validation logic (episode structure, ID formats, required fields) | ✅ | 2025-10-11 |
| TASK-003 | Create `scripts/lib/cli-utils.ts` with argument parsing, help display, and common CLI patterns | ✅ | 2025-10-11 |
| TASK-004 | Create `scripts/lib/file-operations.ts` with safe file reading/writing utilities and TypeScript formatting functions | ✅ | 2025-10-11 |
| TASK-005 | Create `scripts/lib/code-generation.ts` with TypeScript AST generation utilities for creating properly formatted code | ✅ | 2025-10-11 |
| TASK-006 | Extract metadata source configuration helpers into `scripts/lib/source-config.ts` for consistent API initialization | ✅ | 2025-10-11 |
| TASK-007 | Refactor `validate-episode-data.ts` to use new shared utilities and verify functionality is preserved | ✅ | 2025-10-11 |
| TASK-008 | Create comprehensive tests for all shared utilities in `test/scripts/lib/` directory | ✅ | 2025-10-11 |
| TASK-009 | Update TypeScript paths configuration to support script-level imports if necessary | ✅ | 2025-10-11 |
| TASK-010 | Document shared utilities with JSDoc comments explaining usage patterns and examples | ✅ | 2025-10-11 |

### Implementation Phase 2: Data Generation Core

- GOAL-002: Implement core data generation script with metadata fetching and file generation

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Create `scripts/generate-star-trek-data.ts` with CLI argument parsing (--mode, --series, --dry-run, --output, --validate) and environment variable loading | ✅ | 2025-10-11 |
| TASK-012 | Implement data fetching pipeline using existing `createMetadataSources()` factory with all available sources | ✅ | 2025-10-11 |
| TASK-013 | Create series discovery logic to fetch complete lists of Star Trek series from TMDB and Memory Alpha | ✅ | 2025-10-11 |
| TASK-014 | Implement season/episode enumeration for each discovered series with comprehensive metadata collection | ✅ | 2025-10-11 |
| TASK-015 | Add movie discovery and metadata fetching (theatrical releases, TV movies, special presentations) | ✅ | 2025-10-11 |
| TASK-016 | Create data normalization pipeline using composition utilities to standardize formats across sources | ✅ | 2025-10-11 |
| TASK-017 | Implement era classification logic to group content chronologically (Enterprise Era, TOS Era, TNG Era, etc.) | ✅ | 2025-10-11 |
| TASK-018 | Add chronological ordering algorithms based on in-universe stardates and timelines | ✅ | 2025-10-11 |
| TASK-019 | Create TypeScript code generation templates for `starTrekData` array structure with proper typing | ✅ | 2025-10-11 |
| TASK-020 | Implement intelligent merging when multiple sources provide data for same content (priority: Memory Alpha > TMDB > TrekCore) | ✅ | 2025-10-11 |
| TASK-021 | Add data validation step that uses existing `validateEpisodeWithReporting()` before file generation | ✅ | 2025-10-11 |
| TASK-022 | Implement file writing with atomic operations and backup creation for safety | ✅ | 2025-10-11 |
| TASK-023 | Add comprehensive logging with progress indicators, data source attribution, and error summaries | ✅ | 2025-10-11 |
| TASK-024 | Create dry-run mode that shows what would be generated without writing files | ✅ | 2025-10-11 |
| TASK-025 | Implement incremental update mode that preserves manual edits and custom notes in existing data | ✅ | 2025-10-11 |

### Implementation Phase 3: Data Quality & Validation

- GOAL-003: Ensure generated data meets quality standards and maintains consistency

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-026 | Create `scripts/lib/data-quality.ts` with quality scoring algorithms for generated data | ✅ | 2025-10-12 |
| TASK-027 | Implement episode ID validation and auto-generation following project conventions (series_s{season}_e{episode}) | ✅ | 2025-10-12 |
| TASK-028 | Add duplicate detection to prevent data conflicts and ID collisions | ✅ | 2025-10-12 |
| TASK-029 | Create completeness checks to ensure required fields are populated (title, airDate, synopsis minimum) | ✅ | 2025-10-12 |
| TASK-030 | Implement chronology validation to verify stardate ordering and timeline consistency | ✅ | 2025-10-12 |
| TASK-031 | Add cross-reference validation for connections between episodes and continuity tracking | ✅ | 2025-10-12 |
| TASK-032 | Create data diff utility to compare generated data with existing file and show changes | ✅ | 2025-10-12 |
| TASK-033 | Implement formatting validation to ensure generated TypeScript compiles and passes linting | ✅ | 2025-10-12 |
| TASK-034 | Add metadata provenance tracking in comments (// Source: Memory Alpha, Last Updated: 2025-10-11) | ✅ | 2025-10-12 |
| TASK-035 | Create data quality report generation (completeness %, source coverage, validation issues) | ✅ | 2025-10-12 |

### Implementation Phase 4: GitHub Actions Integration

- GOAL-004: Automate data updates with scheduled GitHub Actions workflow and PR creation

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-036 | Create `.github/workflows/update-star-trek-data.yaml` with scheduled trigger (weekly on Mondays) | | |
| TASK-037 | Configure workflow with manual dispatch trigger for on-demand updates and testing | | |
| TASK-038 | Set up Node.js 22.x and pnpm environment matching CI workflow configuration | | |
| TASK-039 | Configure repository secrets for API keys (TMDB_API_KEY, other service credentials) | | |
| TASK-040 | Implement data generation step in workflow using `pnpm exec jiti scripts/generate-star-trek-data.ts` | | |
| TASK-041 | Add validation step that runs `scripts/validate-episode-data.ts` against generated data | | |
| TASK-042 | Configure git identity for workflow commits (git config user.name/user.email) | | |
| TASK-043 | Implement change detection to skip PR creation if no data changes detected | | |
| TASK-044 | Create automated PR with detailed body including changelog, quality metrics, and validation results | | |
| TASK-045 | Add PR labels (automated, data-update) for filtering and automation rules | | |
| TASK-046 | Configure PR to target main branch with descriptive title format (e.g., "Update Star Trek data - 2025-10-11") | | |
| TASK-047 | Implement data diff summary in PR description showing added/modified/removed content | | |
| TASK-048 | Add CI integration to run full test suite on data update PRs before merging | | |
| TASK-049 | Configure branch protection to require approval before merging data updates (security review) | | |
| TASK-050 | Add workflow failure notifications via GitHub notifications or optional webhook integrations | | |

### Implementation Phase 5: Testing & Documentation

- GOAL-005: Comprehensive testing and documentation for data generation system

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-051 | Create `test/scripts/generate-star-trek-data.test.ts` with comprehensive test coverage | | |
| TASK-052 | Test data fetching pipeline with mocked metadata sources (test all API integrations) | | |
| TASK-053 | Test data normalization and merging logic with various input formats and edge cases | | |
| TASK-054 | Test TypeScript code generation output for syntax validity and type correctness | | |
| TASK-055 | Test incremental update mode to ensure manual edits are preserved correctly | | |
| TASK-056 | Test validation integration to catch data quality issues before file generation | | |
| TASK-057 | Test dry-run mode output and verify no files are modified | | |
| TASK-058 | Create integration tests that verify generated data works with existing app code | | |
| TASK-059 | Test error handling for API failures, rate limiting, and malformed responses | | |
| TASK-060 | Create `docs/data-generation.md` with comprehensive usage guide and examples | | |
| TASK-061 | Document CLI options and flags with detailed descriptions and use cases | | |
| TASK-062 | Document GitHub Actions workflow configuration and secret setup requirements | | |
| TASK-063 | Create troubleshooting guide for common issues (API failures, validation errors, merge conflicts) | | |
| TASK-064 | Add ADR (Architecture Decision Record) explaining data generation design choices | | |
| TASK-065 | Update main README.md with section on automated data updates and contribution guidelines | | |

### Implementation Phase 6: Advanced Features & Optimization

- GOAL-006: Enhance data generation with advanced features and performance optimization

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-066 | Implement parallel data fetching with configurable concurrency limits for performance | | |
| TASK-067 | Add caching layer for API responses to reduce redundant requests during development | | |
| TASK-068 | Create data patch system for quick fixes without full regeneration | | |
| TASK-069 | Implement smart update detection to only fetch data for new content (check TMDB latest releases) | | |
| TASK-070 | Add support for custom data overrides file to preserve manual corrections and annotations | | |
| TASK-071 | Create data export functionality to generate alternate formats (JSON, CSV) for analysis | | |
| TASK-072 | Implement data visualization/preview mode to show generated structure before writing | | |
| TASK-073 | Add configuration file (`scripts/config/data-generation.config.ts`) for customizable behavior | | |
| TASK-074 | Create plugin system for custom data transformations and enrichment strategies | | |
| TASK-075 | Add telemetry/analytics to track data generation success rates and common issues | | |

## 3. Alternatives

- **ALT-001**: Manual data updates - Rejected because it's time-consuming, error-prone, and doesn't scale as Star Trek content expands
- **ALT-002**: Using a CMS or database backend - Rejected to maintain local-first, static-site architecture and avoid hosting costs
- **ALT-003**: Fetching data at runtime in browser - Rejected due to CORS limitations, API rate limits, and offline functionality requirements
- **ALT-004**: Using a third-party Star Trek API service - Rejected due to reliability concerns, cost, and desire for data ownership and control
- **ALT-005**: Crowdsourced data updates via GitHub issues - Considered as complement but not replacement for automated updates
- **ALT-006**: Using web scraping exclusively without APIs - Rejected due to fragility, legal concerns, and maintenance burden

## 4. Dependencies

- **DEP-001**: Existing metadata sources infrastructure (`src/modules/metadata-sources.ts`) must be stable and production-ready
- **DEP-002**: TMDB API account with valid API key for movie/series database access
- **DEP-003**: Memory Alpha access (public wiki, respect robots.txt and rate limits)
- **DEP-004**: TrekCore API or scraping access for supplementary data
- **DEP-005**: STAPI API for structured Star Trek data (optional but recommended)
- **DEP-006**: GitHub Actions runner with sufficient compute time allocation for data generation
- **DEP-007**: Repository write permissions for workflow to create PRs and commit changes
- **DEP-008**: TypeScript compiler and code formatting tools (Prettier, ESLint) for code generation
- **DEP-009**: Vitest testing framework for comprehensive test coverage
- **DEP-010**: `jiti` TypeScript runner for executing scripts in development and CI environments
- **DEP-011**: `dotenv` for loading API keys and configuration in local development

## 5. Files

- **FILE-001**: `scripts/generate-star-trek-data.ts` - Main data generation CLI script with full pipeline implementation
- **FILE-002**: `scripts/lib/metadata-utils.ts` - Shared metadata fetching and normalization utilities
- **FILE-003**: `scripts/lib/data-validation.ts` - Reusable validation logic for episode and series data
- **FILE-004**: `scripts/lib/cli-utils.ts` - Common CLI patterns and argument parsing helpers
- **FILE-005**: `scripts/lib/file-operations.ts` - Safe file I/O and TypeScript formatting utilities
- **FILE-006**: `scripts/lib/code-generation.ts` - TypeScript AST generation for programmatic code creation
- **FILE-007**: `scripts/lib/source-config.ts` - Metadata source configuration and initialization helpers
- **FILE-008**: `scripts/lib/data-quality.ts` - Data quality scoring and validation algorithms
- **FILE-009**: `scripts/config/data-generation.config.ts` - Configuration file for generation behavior customization
- **FILE-010**: `.github/workflows/update-star-trek-data.yaml` - GitHub Actions workflow for automated updates
- **FILE-011**: `test/scripts/generate-star-trek-data.test.ts` - Comprehensive test suite for generation script
- **FILE-012**: `test/scripts/lib/*.test.ts` - Tests for all shared utility modules
- **FILE-013**: `docs/data-generation.md` - Complete usage guide and documentation
- **FILE-014**: `docs/adr/data-generation-architecture.md` - Architecture Decision Record documenting design
- **FILE-015**: `src/data/star-trek-data.ts` - Generated output file (existing, will be updated by script)
- **FILE-016**: `scripts/validate-episode-data.ts` - Existing validation script (will be refactored to use shared utilities)

## 6. Testing

- **TEST-001**: Unit tests for metadata fetching utilities with mocked API responses
- **TEST-002**: Unit tests for data normalization pipeline with various input formats
- **TEST-003**: Unit tests for code generation templates and TypeScript formatting
- **TEST-004**: Unit tests for validation logic with valid and invalid data samples
- **TEST-005**: Unit tests for file operations and atomic write safety
- **TEST-006**: Integration tests verifying generated data structure matches expected schema
- **TEST-007**: Integration tests ensuring generated data works with existing episode tracker
- **TEST-008**: Integration tests for CLI argument parsing and error handling
- **TEST-009**: Integration tests for incremental update mode preserving manual edits
- **TEST-010**: E2E tests running full generation pipeline with real metadata sources (in CI)
- **TEST-011**: E2E tests verifying GitHub Actions workflow execution (using act or similar)
- **TEST-012**: Regression tests ensuring generated data doesn't break existing features
- **TEST-013**: Performance tests measuring generation time and memory usage with full dataset
- **TEST-014**: Security tests validating data sanitization and XSS prevention
- **TEST-015**: Compatibility tests ensuring generated TypeScript compiles and passes linting

## 7. Risks & Assumptions

- **RISK-001**: API rate limits could prevent complete data generation - Mitigation: implement caching, incremental updates, and multiple data sources
- **RISK-002**: API schema changes could break integration - Mitigation: comprehensive error handling, validation, and fallback to cached data
- **RISK-003**: Generated file size could grow too large - Mitigation: implement data splitting strategies or lazy loading if needed
- **RISK-004**: Manual edits in `star-trek-data.ts` could be lost - Mitigation: implement merge strategies and preserve custom annotations
- **RISK-005**: Workflow failures could leave repository in inconsistent state - Mitigation: use atomic operations, branch protection, and rollback procedures
- **RISK-006**: Data quality issues could introduce bugs - Mitigation: extensive validation, quality scoring, and required human review for PRs
- **RISK-007**: API credentials could be exposed or compromised - Mitigation: use GitHub secrets, rotate keys regularly, monitor usage
- **RISK-008**: GitHub Actions costs could increase - Mitigation: optimize generation time, use caching aggressively, adjust schedule if needed
- **ASSUMPTION-001**: TMDB and other APIs will remain available and stable for long-term use
- **ASSUMPTION-002**: Star Trek content release schedule allows weekly update frequency to be sufficient
- **ASSUMPTION-003**: Generated data size will remain manageable (<2MB) with current content volume
- **ASSUMPTION-004**: Existing metadata sources provide sufficient data coverage for all Star Trek content
- **ASSUMPTION-005**: Manual human review will be feasible for weekly data update PRs (reasonable change volume)
- **ASSUMPTION-006**: GitHub Actions will continue to support required workflow features and quotas

## 8. Related Specifications / Further Reading

- [Episode Metadata Enrichment System Plan](./feature-episode-metadata-enrichment-1.md) - Foundation metadata system
- [validate-episode-data.ts](../../scripts/validate-episode-data.ts) - Reference implementation for validation patterns
- [metadata-sources.ts](../../src/modules/metadata-sources.ts) - Existing API integration infrastructure
- [GitHub Actions Workflow Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [TMDB API Documentation](https://developers.themoviedb.org/3) - Movie/TV database API reference
- [Memory Alpha](https://memory-alpha.fandom.com) - Star Trek wiki source
- [Prettier Code Generation Guide](https://prettier.io/docs/en/api.html) - For consistent TypeScript formatting
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) - For AST-based code generation
