---
goal: 'Refactor ProgressTracker, SearchFilter, and TimelineRenderer classes to functional factory patterns with closures for state management'
version: '1.0'
date_created: '2025-07-31'
last_updated: '2025-07-31'
owner: 'VBS Development Team'
status: 'Planned'
tags: [refactor, architecture, functional, typescript]
---

# Refactor VBS Modules to Functional Factory Patterns

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan refactors the VBS (View By Stardate) module classes from class-based architecture to functional factory patterns using closures for state management. The refactoring eliminates class inheritance and `this` binding issues while maintaining identical public APIs and behavior.

## 1. Requirements & Constraints

- **REQ-001**: Maintain exact same public API signatures for all module methods
- **REQ-002**: Preserve all existing callback functionality and event handling
- **REQ-003**: Keep dependency injection working (TimelineRenderer depends on ProgressTracker)
- **REQ-004**: Ensure all existing tests continue to pass without behavior changes
- **REQ-005**: Maintain TypeScript type safety and proper return type definitions
- **REQ-006**: Use closures for private state management instead of private class fields
- **REQ-007**: Replace class constructors with factory functions returning public method objects
- **CON-001**: No breaking changes allowed - must be backward compatible from consumer perspective
- **CON-002**: Must preserve LocalStorage integration and progress tracking behavior
- **CON-003**: DOM event handling and rendering behavior must remain identical
- **CON-004**: Factory functions must support same initialization patterns as constructors
- **GUD-001**: Follow existing TypeScript patterns and ESLint configuration
- **GUD-002**: Use immutable state operations where possible for functional paradigm
- **GUD-003**: Maintain clear separation of concerns between modules
- **PAT-001**: Use factory function pattern: `export const createModuleName = () => ({ publicMethods })`
- **PAT-002**: Private state managed via closure variables: `let privateState = initialValue`
- **PAT-003**: Return object with public methods that access closure state

## 2. Implementation Steps

### Implementation Phase 1: Type Definitions and Infrastructure

- GOAL-001: Establish TypeScript type definitions for factory function return types and maintain API compatibility

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-001 | Add factory return type definitions to `src/modules/types.ts` for ProgressTracker, SearchFilter, and TimelineRenderer | ✅ | 2025-07-31 |
| TASK-002 | Create type aliases for factory function signatures to ensure proper dependency injection | ✅ | 2025-07-31 |
| TASK-003 | Verify TypeScript compilation with new type definitions | ✅ | 2025-07-31 |

### Implementation Phase 2: ProgressTracker Refactoring

- GOAL-002: Convert ProgressTracker class to createProgressTracker factory function maintaining exact same public API

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-004 | Replace ProgressTracker class with createProgressTracker factory function in `src/modules/progress.ts` |  |  |
| TASK-005 | Convert private fields to closure variables: watchedItems, callbacks |  |  |
| TASK-006 | Implement all public methods as closure-accessing functions with identical signatures |  |  |
| TASK-007 | Ensure callback management and event handling behavior is preserved |  |  |
| TASK-008 | Verify progress calculation logic remains unchanged |  |  |

### Implementation Phase 3: SearchFilter Refactoring

- GOAL-003: Convert SearchFilter class to createSearchFilter factory function maintaining exact same public API

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-009 | Replace SearchFilter class with createSearchFilter factory function in `src/modules/search.ts` |  |  |
| TASK-010 | Convert private fields to closure variables: currentSearch, currentFilter, callbacks |  |  |
| TASK-011 | Implement all public methods as closure-accessing functions with identical signatures |  |  |
| TASK-012 | Ensure search and filter logic behavior is preserved |  |  |
| TASK-013 | Verify callback management for filter changes remains unchanged |  |  |

### Implementation Phase 4: TimelineRenderer Refactoring

- GOAL-004: Convert TimelineRenderer class to createTimelineRenderer factory function maintaining dependency injection and public API

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-014 | Replace TimelineRenderer class with createTimelineRenderer factory function in `src/modules/timeline.ts` |  |  |
| TASK-015 | Convert private fields to closure variables: container, progressTracker, expandedEras |  |  |
| TASK-016 | Implement all public methods as closure-accessing functions with identical signatures |  |  |
| TASK-017 | Ensure DOM rendering and event handling behavior is preserved |  |  |
| TASK-018 | Verify progress update integration with ProgressTracker factory works correctly |  |  |

### Implementation Phase 5: Main Application Integration

- GOAL-005: Update main.ts to use factory functions instead of class constructors while maintaining functionality

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-019 | Update import statements in `src/main.ts` to import factory functions instead of classes |  |  |
| TASK-020 | Replace `new ProgressTracker()` with `createProgressTracker()` on line 164 |  |  |
| TASK-021 | Replace `new SearchFilter()` with `createSearchFilter()` on line 165 |  |  |
| TASK-022 | Replace `new TimelineRenderer(container, progressTracker)` with `createTimelineRenderer(container, progressTracker)` on line 187 |  |  |
| TASK-023 | Verify all module interactions and callback registrations work correctly |  |  |

### Implementation Phase 6: Test Suite Updates

- GOAL-006: Update all test files to use factory functions while maintaining identical test behavior and expectations

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-024 | Update `test/progress.test.ts` to import and use createProgressTracker factory function |  |  |
| TASK-025 | Replace `new ProgressTracker()` with `createProgressTracker()` in progress test beforeEach |  |  |
| TASK-026 | Update `test/search.test.ts` to import and use createSearchFilter factory function |  |  |
| TASK-027 | Replace `new SearchFilter()` with `createSearchFilter()` in search test beforeEach |  |  |
| TASK-028 | Verify all existing test assertions continue to pass without modification |  |  |

### Implementation Phase 7: Documentation and Validation

- GOAL-007: Update documentation and perform comprehensive validation of the refactored system

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-029 | Update `.github/copilot-instructions.md` to reflect functional factory pattern examples |  |  |
| TASK-030 | Run full test suite to ensure no regressions |  |  |
| TASK-031 | Build production bundle to verify TypeScript compilation |  |  |
| TASK-032 | Perform manual testing of all UI interactions and progress tracking |  |  |
| TASK-033 | Validate import/export functionality works correctly with factory-based modules |  |  |

## 3. Alternatives

- **ALT-001**: Keep class-based architecture and only refactor internal implementation - rejected because goal is to eliminate class inheritance and `this` binding entirely
- **ALT-002**: Use object composition with factory functions that return classes - rejected because this still involves class instantiation and `this` binding
- **ALT-003**: Convert to pure functional components without state management - rejected because modules need to maintain state for progress tracking and UI interactions
- **ALT-004**: Use external state management library like Redux - rejected because it adds unnecessary complexity for local-first application

## 4. Dependencies

- **DEP-001**: TypeScript compiler for type checking factory function return types
- **DEP-002**: Vitest test runner for validating functionality after refactoring
- **DEP-003**: ESLint configuration for code style validation
- **DEP-004**: Existing star-trek-data.ts for data access in refactored modules
- **DEP-005**: Browser LocalStorage API integration in storage.ts module

## 5. Files

- **FILE-001**: `src/modules/types.ts` - Add factory function return type definitions
- **FILE-002**: `src/modules/progress.ts` - Convert ProgressTracker class to createProgressTracker factory
- **FILE-003**: `src/modules/search.ts` - Convert SearchFilter class to createSearchFilter factory
- **FILE-004**: `src/modules/timeline.ts` - Convert TimelineRenderer class to createTimelineRenderer factory
- **FILE-005**: `src/main.ts` - Update to use factory functions instead of class constructors
- **FILE-006**: `test/progress.test.ts` - Update tests to use createProgressTracker factory
- **FILE-007**: `test/search.test.ts` - Update tests to use createSearchFilter factory
- **FILE-008**: `.github/copilot-instructions.md` - Update documentation to reflect functional patterns

## 6. Testing

- **TEST-001**: Verify all existing unit tests pass without modification to test assertions
- **TEST-002**: Test progress tracking functionality works identically with factory functions
- **TEST-003**: Test search and filter functionality maintains same behavior
- **TEST-004**: Test timeline rendering and DOM interactions work correctly
- **TEST-005**: Test callback registration and event handling functions properly
- **TEST-006**: Test dependency injection between TimelineRenderer and ProgressTracker factories
- **TEST-007**: Integration test of full application workflow from main.ts initialization
- **TEST-008**: Test import/export functionality works with refactored modules

## 7. Risks & Assumptions

- **RISK-001**: TypeScript type inference may have issues with factory function return types requiring explicit type annotations
- **RISK-002**: Callback function references may behave differently with closure scope vs class method scope
- **RISK-003**: Memory management may differ between class instances and closure-based objects
- **RISK-004**: Developer unfamiliarity with functional factory patterns may lead to maintenance issues
- **ASSUMPTION-001**: All current functionality is fully captured by existing test suite
- **ASSUMPTION-002**: No external consumers depend on class inheritance or instanceof checks
- **ASSUMPTION-003**: Factory function performance will be equivalent to class instantiation
- **ASSUMPTION-004**: Closure-based state management will not cause memory leaks in single-page application

## 8. Related Specifications / Further Reading

- [VBS GitHub Copilot Instructions](../../.github/copilot-instructions.md) - Current architecture documentation
- [TypeScript Factory Pattern Documentation](https://www.typescriptlang.org/docs/handbook/2/classes.html#factory-functions)
- [JavaScript Closures and State Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)
- [Functional Programming Patterns in TypeScript](https://www.typescriptlang.org/docs/handbook/2/functions.html)
