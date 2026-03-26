# GitHub Copilot Instructions for VBS

## Quick Reference

**Architecture**: Functional factory patterns with closures

**Testing**: Vitest with factory instantiation in `beforeEach`

**Style**: TypeScript strict mode with single quotes

**Build**: Vite with `/vbs/` base path

**Key Principles**: Type safety · Functional composition · Generic EventEmitters · No `this` binding · Closure-based state

See `AGENTS.md` for project knowledge base, `src/modules/AGENTS.md` and `src/components/AGENTS.md` for domain-specific conventions.

## Critical Rules (AI Failure Modes)

| Pattern | DO | DON'T |
| --- | --- | --- |
| ESM imports | Use `.js` extension in all TS ESM imports | Omit extension (`'./foo'`) |
| String style | Use single quotes | Use double quotes inconsistently |
| Null safety | Use `?.` and `??` for safe access/defaults | Chain unsafe property access |
| Public API types | Add explicit return types on exported/public functions | Rely on implicit return types for exported APIs |
| Generic constraints | Use `<T extends SomeType>` where needed | Use unconstrained generics that weaken contracts |
| Event typing | Use `createEventEmitter<TEventMap>()` with defined event maps | Emit untyped event payloads |
| Composition style | Use `pipe()` for left-to-right flow and `curry()` for reusable predicates | Build ad-hoc imperative transform chains |
| Error boundaries | Wrap risky async/sync paths with `withErrorHandling()` / `withSyncErrorHandling()` | Leave public operations unwrapped |
| Type safety | Use `unknown` + type guards | Use `any` |
| Architecture | Use functional factories with closures | Introduce class-based modules |
| State access | Keep state in closure scope | Use `this` binding/context coupling |
| Credentials | Use runtime configuration (`loadEnv()` in scripts) | Hardcode API keys/secrets |
| Styling | Use CSS custom properties and component CSS files | Add inline styles in TS |
| DOM boundaries | Keep DOM manipulation inside component factories | Manipulate DOM directly from unrelated modules |
| Storage writes | Batch writes to localStorage-sensitive flows | Perform synchronous writes in loops |
| Cleanup | Provide `destroy()` for listener/timer cleanup | Leave components/factories without teardown |

**Critical import rule (top failure mode):**

```typescript
// ✅ CORRECT - Always use .js extension
import {createProgressTracker} from './progress.js'
import {loadEnv} from '../lib/cli-utils.js'

// ❌ WRONG - Missing .js extension will cause runtime errors
import {createProgressTracker} from './progress'
import {loadEnv} from '../lib/cli-utils'
```

## Architecture Overview

VBS uses a functional factory architecture with closure-based state and generic EventEmitters.

Factories expose a typed public API while keeping mutable state private in closure scope.

Core logic lives in `src/modules/`, and UI factories live in `src/components/`.

Composition utilities in `src/utils/composition.ts` support reusable data pipelines across modules.

See `AGENTS.md` for full project structure and file locations.

## Factory Pattern

```typescript
export const createProgressTracker = (): ProgressTrackerInstance => {
  let watchedItems: string[] = []
  const eventEmitter = createEventEmitter<ProgressTrackerEvents>()
  return {
    toggleItem: (itemId: string) =>
      eventEmitter.emit('item-toggle', {
        itemId,
        isWatched: !watchedItems.includes(itemId),
      }),
    on: eventEmitter.on.bind(eventEmitter),
    off: eventEmitter.off.bind(eventEmitter),
    once: eventEmitter.once.bind(eventEmitter),
  }
}
```

## Composition Utilities

- `pipe()` — left-to-right function composition
- `compose()` — right-to-left composition
- `curry()` — partial application with arity handling
- `tap()` — side effects without breaking data flow
- `asyncPipe()` — async composition across Promise-returning steps

VBS-specific pipeline builders (`createSearchPipeline`, `createProgressPipeline`, related predicates/transformations) are defined in `src/utils/composition.ts`.

For full examples, see `docs/composition-examples.md`.

## Type System

- Use `createEventEmitter<TEventMap>()` for type-safe event registration and emission.
- Use `createLogger(...)` for structured logging in modules that need metrics/levels.
- Use `StorageAdapter<T>` and generic storage utilities for typed persistence boundaries.
- Reuse utility types in `src/modules/types.ts` before introducing new ad-hoc types.
- Keep module-specific event maps in `src/modules/types.ts` and wire them to factories.

See `docs/generic-types-examples.md` for full examples.

## ID Validation Patterns

Use these exact regex patterns when validating Star Trek IDs:

```typescript
const EPISODE_ID_PATTERN = /^[a-z]+_s\d+_e\d+$/
const SEASON_ID_PATTERN = /^[a-z]+_s\d+$/
const SERIES_ID_PATTERN = /^[a-z]+(?:_s\d+)?$/
```

Episode IDs look like `tng_s3_e15`.

Season IDs look like `tng_s3`.

Series IDs look like `tng`.

## Service Worker & PWA

- Register service worker at `/vbs/sw.js` with scope `/vbs/`.
- Keep registration/path assumptions aligned with GitHub Pages base path.
- Detect Background Sync capability and degrade gracefully by strategy.
- Supported fallback strategies: `immediate`, `polling`, `manual`, `disabled`.
- Metadata sync behavior must remain predictable when Background Sync is unavailable.
- Keep update-detection behavior intact so users can refresh on new SW versions.

## Testing

- Framework: Vitest.
- Instantiate factories in `beforeEach`.
- Use `vi.fn()` for listener/dependency mocks.
- Test event emissions and payload shapes, not only return values.
- **Critical**: imports in tests also require `.js` extensions.
- Mock localStorage for storage-focused tests.
- Save/restore `process.env` in before/after hooks for environment-dependent tests.
- Test both configured-credential and missing-credential flows where relevant.

## Accessibility

- ✅ **Semantic HTML**: Use appropriate ARIA labels and roles
- ✅ **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- ✅ **Screen reader support**: Provide meaningful `aria-label` and `aria-describedby` attributes
- ✅ **Focus management**: Implement visible focus indicators with `:focus-visible`
- ✅ **Color contrast**: Maintain WCAG AA standards (4.5:1 for normal text)

## LocalStorage Schema

Progress data structure for import/export functionality:

```typescript
interface ProgressExportData {
  version: string // "1.0"
  timestamp: string // ISO string
  progress: string[] // Array of watched item IDs
}
```

Progress stored as flat array of item IDs, not nested by era.

## Extension Points

- New content types: extend `StarTrekItem.type` and update filtering.
- New progress metrics: extend `ProgressData` and update calculation paths.
- New export formats: add handlers alongside existing JSON import/export flow.
- Timeline enhancements: extend timeline factories without introducing new architecture.
- Episode metadata fields: extend episode interfaces and downstream validators.
- Metadata sources: add integrations in `metadata-sources.ts` with existing rate-limit patterns.
- Conflict resolution strategies: extend `conflict-resolution.ts` for field-level merge decisions.
- Metadata storage policy: adjust TTL and caching behavior in `metadata-storage.ts`.
- Queue job types: add typed operations in `metadata-queue.ts` beyond existing jobs.
- Migration strategies: add new schema handlers in `migration.ts`.
- Version compatibility: update `version-manager.ts` matrices for breaking changes.
- Validation rules: add validators in `progress-validation.ts` and keep error recovery predictable.
- Spoiler management: extend classification/filtering without regressing safe defaults.
- Composition pipelines: add domain-specific builders via existing composition utilities.
- Debug helpers: use existing debug/perf taps for diagnostics rather than custom one-offs.

## Git Workflow

- Pre-commit quality gates are enforced with `simple-git-hooks` and `lint-staged`.
- Staged files are auto-fixed and checked via ESLint before commit finalization.
- If hooks fail, fix and re-stage files before retrying commit.
- Emergency bypass is allowed via `git commit --no-verify`.
- Bypass is for emergencies only; do not merge unverified code.

## Verification Commands

Run these before submitting changes:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

## References

- `AGENTS.md` — Project structure, conventions, commands
- `src/modules/AGENTS.md` — Core factory modules, metadata pipeline
- `src/components/AGENTS.md` — UI component factories
- `.github/agents/vbs-developer.agent.md` — Feature development patterns
- `.github/agents/data-curator.agent.md` — Data management workflows
- `docs/generic-types-examples.md` — Type system examples
- `docs/composition-examples.md` — Composition utility examples
