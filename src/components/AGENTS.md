# AGENTS.md (src/components/)

**Generated:** 2026-03-25 | **Scope:** UI component factories and co-located styles

## OVERVIEW

UI component factories following the VBS functional pattern: container injection, closure-based state, and mandatory cleanup.

## WHERE TO LOOK

| Domain | Components | Notes |
| --- | --- | --- |
| **Timeline/Viz** | `timeline-controls.ts` + `.css`, `timeline-viz.css` | Controls for timeline nav/filtering; viz CSS pairs with `modules/timeline-viz.ts` |
| **Streaming** | `streaming-indicators.ts` + `.css`, `streaming-preferences.ts` + `.css` | Platform availability, service configuration |
| **Metadata** | `metadata-usage-controls.ts`, `metadata-debug-panel.ts`, `metadata-sync-status.ts`, `metadata-expert-mode.ts`, `metadata-preferences.ts`, `metadata-quality-indicator.ts`, `metadata-source-attribution.ts` | All have co-located `.css`; quota, debugging, sync status, expert config, quality display, source attribution |
| **Utilities** | `migration-progress.ts` | Data migration UI; includes inline styles (exception) |

## CONVENTIONS

- **Co-located CSS**: Every `.ts` component has a matching `.css` file (except `migration-progress.ts`).
- **Factory Pattern**: Components are created via `create[ComponentName](container, ...props)`.
- **Private DOM State**: DOM elements are cached in an `elements` object within the factory closure.
- **Event Delegation**: Use event delegation on the component container for dynamic elements.
- **CSS Scoping**: Use descriptive class names (BEM-like: `component__element`) and the `--vbs-` prefix for custom properties.
- **Data Flow**: Unidirectional; props/params in, generic `EventEmitter` events out.
- **Lifecycle**: Every component MUST implement `destroy()` to remove listeners and clear `innerHTML`.
- **Error Boundaries**: Wrap public methods with `withSyncErrorHandling` or `withErrorHandling`.

## ANTI-PATTERNS

- No `document.getElementById` inside components; use `container.querySelector`.
- No inline styles in `.ts` files; use co-located `.css` (exception: `migration-progress.ts`).
- No leaks; forgetting to remove event listeners in `destroy()` is a critical failure.
- No direct storage access; inject storage instances or pass data via props.
- No hardcoded colors; always use `--vbs-` theme tokens.
