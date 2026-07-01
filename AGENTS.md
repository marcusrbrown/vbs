# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-25 | **Commit:** 2f6b80f | **Branch:** main

## OVERVIEW

VBS (View By Stardate) — local-first Star Trek chronological viewing guide. TypeScript + Vite + D3.js. Functional factory architecture with closure-based state, generic EventEmitters, and composition utilities. Deployed to GitHub Pages at `/vbs/`.

## STRUCTURE

```
vbs/
├── src/
│   ├── main.ts                 # App factory: createStarTrekViewingGuide()
│   ├── style.css               # Global styles + Star Trek theme tokens
│   ├── components/             # UI component factories with co-located CSS
│   ├── data/                   # Star Trek dataset (~570 lines)
│   ├── modules/                # Core logic: factories, events, storage, metadata
│   └── utils/                  # composition.ts (3000+ lines), download, validation, geographic
├── scripts/
│   ├── generate-star-trek-data.ts  # Multi-source data generation CLI
│   ├── validate-episode-data.ts    # Data quality validation CLI
│   └── lib/                        # Shared CLI utilities
├── test/                       # Flat Vitest suite (57 files), mirrors src/ structure
├── docs/                       # ADRs, architecture guides, API docs
└── .github/
    ├── workflows/deploy.yaml   # Build + deploy to GitHub Pages
    ├── copilot-instructions.md # Comprehensive coding standards
    └── renovate.json5          # Dependency automation
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Add Star Trek content | `src/data/star-trek-data.ts` | Item IDs must be unique across all eras |
| New factory module | `src/modules/` | Follow closure pattern, add EventEmitter, export types in `types.ts` |
| New UI component | `src/components/` | Co-locate `.ts` + `.css`, provide `destroy()` method |
| Modify composition utils | `src/utils/composition.ts` | 3000+ lines; pipe/compose/curry/tap + VBS-specific pipeline builders |
| Type definitions | `src/modules/types.ts` | All public interfaces and event maps live here |
| CLI scripts | `scripts/` | Run via `pnpm exec jiti scripts/<name>.ts`; call `loadEnv()` first |
| Tests | `test/<module>.test.ts` | Flat structure, factory instantiation in `beforeEach` |
| Type-level tests | `test/type-safety.test-d.ts` | Vitest type checking for `.test-d.ts` files |
| Error handling | `src/modules/error-handler.ts` | `withErrorHandling()` and `withSyncErrorHandling()` wrappers |
| Schema versioning | `src/modules/version-manager.ts` | Singleton `versionManager` for migration compatibility |
| Theme system | `src/modules/themes.ts` | CSS custom properties with `--vbs-` prefix |

## CONVENTIONS

- **Functional factories only** — no classes, no `this` binding
- **Closure-based state** — private state in factory closures, public API returned
- **Generic EventEmitters** — `createEventEmitter<TEventMap>()` for type-safe events; all modules use event maps
- **`.js` extensions in imports** — required for ES module resolution (`import from './foo.js'`)
- **Single quotes** everywhere
- **No `any`** — use `unknown` + type guards
- **No inline styles** — CSS custom properties via theme system
- **All components provide `destroy()`** for cleanup
- **Shared configs** — `@bfra.me/eslint-config`, `@bfra.me/prettier-config`, `@bfra.me/tsconfig`
- **Pre-commit** — `simple-git-hooks` + `lint-staged` runs `eslint --fix` on staged files

## ANTI-PATTERNS (THIS PROJECT)

- No class-based patterns — factory functions with closures only
- No `this` binding — closures eliminate context issues
- No hardcoded credentials — use `loadEnv()` + runtime config
- No direct DOM manipulation outside component factories
- No synchronous localStorage writes in loops — batch operations
- No missing cleanup — every component/factory must handle teardown
- No `any` type — `unknown` with type guards or proper generics
- No imports without `.js` extension — will cause runtime errors

## COMMANDS

```bash
pnpm dev              # Vite dev server (port 3000)
pnpm build            # tsc && vite build
pnpm test             # vitest run
pnpm test:coverage    # vitest run --coverage
pnpm test:ui          # vitest --ui
pnpm lint             # eslint
pnpm fix              # eslint --fix
pnpm type-check       # tsc --noEmit
pnpm preview          # preview production build (port 4173)

# CLI scripts
pnpm exec jiti scripts/generate-star-trek-data.ts --mode full --validate
pnpm exec jiti scripts/validate-episode-data.ts
```

## NOTES

- **Build base path**: `/vbs/` — required for GitHub Pages routing
- **Manual chunks**: `star-trek-data.ts` bundled separately for caching
- **Source maps**: enabled in production
- **Node.js 24.x** in CI (cutting-edge)
- **pnpm@11.x** — never use npm/yarn
- **Renovate** (not Dependabot) for dependency updates, extends `marcusrbrown/renovate-config`
- **No release automation** — manual deploy via GitHub Actions on push to main
- **Test environment**: jsdom; globals enabled; type checking for `.test-d.ts` files
- **ID patterns**: episodes=`tng_s3_e15`, seasons=`tng_s3`, series=`tng` — validated via regex
- **Migration system**: schema versioning in `version-manager.ts` with forward/backward compat matrices
- **Metadata pipeline**: multi-source (TMDB, Memory Alpha, TrekCore, STAPI) with quality scoring (min 0.6)
- **ESLint exception**: `no-use-before-define` disabled; `console` allowed in `logger.ts`

## CHILD AGENTS

- [`src/modules/AGENTS.md`](src/modules/AGENTS.md) — Core factory modules, state management, metadata pipeline
- [`src/components/AGENTS.md`](src/components/AGENTS.md) — UI component factories with co-located CSS
