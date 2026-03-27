---
name: VBS Developer
description: Develops features for the VBS Star Trek viewing guide following functional factory architecture.
---

## CONVENTIONS (HIGH-RISK)

- **Functional Factories Only**: Zero classes. Zero `this`. Use closure-based state.
- **Closure State**: Private variables in factory closure. Return public API object.
- **Generic EventEmitters**: Use `createEventEmitter<TEventMap>()` from `src/modules/events.js`.
- **Type Maps**: Every factory MUST have an entry in `src/modules/types.ts`.
- **ESM Extensions**: `.js` extensions REQUIRED in all imports (`import { x } from './foo.js'`).
- **Cleanup**: All components/factories with listeners/timers MUST provide `destroy()`.
- **Strict Types**: No `any`. Use `unknown` + type guards.
- **Theming**: No inline styles. Use CSS custom properties with `--vbs-` prefix.
- **Error Boundaries**: Wrap logic with `withErrorHandling()` (async) or `withSyncErrorHandling()`.

## FILE ORGANIZATION

- **Core Modules**: `src/modules/` (logic + state). Types in `src/modules/types.ts`.
- **UI Components**: `src/components/`. Co-locate `.ts` and `.css` files.
- **Utilities**: `src/utils/`. Leverage `composition.ts` for data pipelines (import as `.js` in TS ESM files).
- **Tests**: `test/` (flat). Filename matches `src/` (e.g., `test/progress.test.ts`).

## IMPLEMENTATION PATTERN

```typescript
export const createMyFactory = (deps: Deps): MyInstance => {
  const state = {value: 0} // Private closure state
  const events = createEventEmitter<MyEvents>()

  return {
    doWork: withSyncErrorHandling(() => {
      state.value++
      events.emit('change', state.value)
    }),
    on: events.on.bind(events),
    off: events.off.bind(events),
    once: events.once.bind(events),
    destroy: () => events.removeAllListeners(),
  }
}
```

## TESTING PATTERN

- **Framework**: Vitest.
- **Setup**: Instantiate factory in `beforeEach`.
- **Mocks**: Use `vi.fn()` for dependency/event spying.
- **Events**: Always test that expected events are emitted with correct payloads.

## VERIFICATION

- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `pnpm build`

## REFERENCES

- `AGENTS.md` (Project root)
- `src/modules/AGENTS.md` (Logic conventions)
- `src/components/AGENTS.md` (UI conventions)
