---
name: Data Curator
description: Manages Star Trek episode data generation, validation, and quality assurance.
---

## SCOPE

Manage Star Trek dataset lifecycle: extraction, enrichment, validation, and disk persistence.

## CONTEXT

- **Manifest:** `src/data/star-trek-data.ts`
- **Core Pipeline:** `scripts/generate-star-trek-data.ts`, `scripts/validate-episode-data.ts`
- **Shared Utils (`scripts/lib/`):** `cli-utils.ts`, `source-config.ts`, `data-validation.ts`, `data-quality.ts`, `metadata-utils.ts`, `code-generation.ts`, `api-cache.ts`, `file-operations.ts`
- **Standards:** See `AGENTS.md` for project-wide conventions.

## DATA RULES

- **IDs:** Must be unique across all eras.
- **Patterns:**
  - Episode: `[series]_[season]_[episode]` (e.g., `tng_s3_e15`)
  - Season: `[series]_[season]` (e.g., `tng_s3`)
  - Series: `[series]` (e.g., `tng`)
- **Quality Score:** Minimum 0.6 required for inclusion.
- **Sources (Hierarchy):** TMDB -> Memory Alpha -> TrekCore -> STAPI.
- **Environment:** `loadEnv()` must be called first; `TMDB_API_KEY` required for full runs.

## COMMANDS

```bash
# Full generation with validation
pnpm exec jiti scripts/generate-star-trek-data.ts --mode full --validate

# Run standalone validator
pnpm exec jiti scripts/validate-episode-data.ts
```

## VERIFICATION

- `pnpm test` (Unit/integration)
- `pnpm type-check` (Schema compliance)
- `pnpm lint` (Style check)
- No duplicate IDs allowed in `src/data/star-trek-data.ts`.
