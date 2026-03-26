# AGENTS: Modules (Core Logic)

**Location**: `src/modules/` | **Layer**: Core Business Logic / State Management

## OVERVIEW

Functional core of VBS. Closure-based factories managing state, events, and persistence. Zero classes.

## WHERE TO LOOK

| Domain | Key Files | Purpose |
| --- | --- | --- |
| **State** | `progress.ts`, `episode-tracker.ts`, `episodes.ts`, `search.ts` | Progress tracking, episode management, filtering |
| **Settings** | `settings-manager.ts`, `preferences.ts`, `themes.ts` | Centralized settings, user prefs, CSS theme tokens |
| **Metadata** | `metadata-sources.ts`, `metadata-queue.ts`, `metadata-scheduler.ts`, `metadata-storage.ts`, `metadata-quality.ts`, `conflict-resolution.ts` | Pipeline: sources -> queue -> scheduler -> storage; quality scoring + conflict resolution |
| **Streaming** | `streaming-api.ts`, `cache-warming.ts` | Service availability, proactive caching |
| **Infrastructure** | `events.ts`, `types.ts`, `storage.ts`, `version-manager.ts`, `error-handler.ts`, `logger.ts`, `migration.ts`, `progress-validation.ts` | EventEmitter, types, persistence, versioning, error boundaries, logging, migration |

## CONVENTIONS

- **Event Mapping**: Every factory must have a corresponding event map in `types.ts`.
- **Closure State**: All state is private within factory closures; only return methods.
- **Error Wrappers**: Wrap risky operations with `withErrorHandling()` (async) or `withSyncErrorHandling()`.
- **Singletons**: `versionManager` and `getGlobalErrorHandler()` — use the global instances, don't recreate.
- **Metadata Pipeline**:
  - Sources use token bucket rate limiting.
  - Quality scoring (min 0.6) before storage.
  - Merge strategy prioritizes high-confidence sources (e.g., TMDB, Memory Alpha).

## ANTI-PATTERNS

- No `this` context — use local closure variables.
- No direct `localStorage` access outside `storage.ts`.
- No inline event listener arrays — use `createEventEmitter<T>()`.
- No complex logic in `types.ts` — keep it pure definitions and small type guards.
- No re-implementing `VersionInfo` logic — use `versionManager`.
