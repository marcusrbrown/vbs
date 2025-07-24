---
goal: Refactor ProgressTracker, SearchFilter, and TimelineRenderer classes to functional factory patterns with closure-based state management
version: 1.0
date_created: 2025-07-24
last_updated: 2025-07-24
owner: VBS Development Team
status: 'Planned'
tags:
  - refactor
  - architecture
  - functional
  - factory-pattern
  - modules
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan refactors the VBS (View By Stardate) application's core modules from class-based architecture to functional factory patterns. The refactoring will eliminate class inheritance and `this` binding issues while maintaining identical public APIs through closure-based state management.

## 1. Requirements & Constraints

- **REQ-001**: Convert ProgressTracker class to createProgressTracker() factory function
- **REQ-002**: Convert SearchFilter class to createSearchFilter() factory function
- **REQ-003**: Convert TimelineRenderer class to createTimelineRenderer() factory function
- **REQ-004**: Maintain identical public API interfaces for all modules
- **REQ-005**: Use closure variables for private state instead of class properties
- **REQ-006**: Preserve all callback registration and notification systems
- **REQ-007**: Maintain immutable state patterns with controlled mutations
- **SEC-001**: Ensure no global state pollution through factory functions
- **CON-001**: Must maintain TypeScript strict mode compatibility
- **CON-002**: Cannot break existing test suite without updating test imports
- **CON-003**: Must preserve all existing DOM event handling patterns
- **GUD-001**: Follow existing VBS coding standards (single quotes, optional chaining)
- **GUD-002**: Use explicit return types on all public factory function methods
- **PAT-001**: Implement factory functions returning object literals with methods
- **PAT-002**: Use closure variables for private state encapsulation

## 2. Implementation Steps

### Phase 1: Core Module Refactoring

| Task ID | File Path | Description | Dependencies |
| --- | --- | --- | --- |
| TASK-001 | `src/modules/progress.ts` | Convert ProgressTracker class to createProgressTracker factory function | None |
| TASK-002 | `src/modules/search.ts` | Convert SearchFilter class to createSearchFilter factory function | None |
| TASK-003 | `src/modules/timeline.ts` | Convert TimelineRenderer class to createTimelineRenderer factory function | TASK-001 |

### Phase 2: Integration Updates

| Task ID | File Path | Description | Dependencies |
| --- | --- | --- | --- |
| TASK-004 | `src/main.ts` | Update imports and instantiation to use factory functions | TASK-001, TASK-002, TASK-003 |
| TASK-005 | `src/modules/types.ts` | Add factory function return type definitions | TASK-001, TASK-002, TASK-003 |

### Phase 3: Test Updates

| Task ID | File Path | Description | Dependencies |
| --- | --- | --- | --- |
| TASK-006 | `test/progress.test.ts` | Update test instantiation to use createProgressTracker() | TASK-001 |
| TASK-007 | `test/search.test.ts` | Update test instantiation to use createSearchFilter() | TASK-002 |
| TASK-008 | `test/storage.test.ts` | Update any ProgressTracker usage to factory function | TASK-001 |

### Phase 4: Validation

| Task ID | File Path | Description | Dependencies |
| --- | --- | --- | --- |
| TASK-009 | All files | Run comprehensive test suite to verify API compatibility | TASK-006, TASK-007, TASK-008 |
| TASK-010 | All files | Verify application functionality through manual testing | TASK-004 |

## 3. Alternatives

- **ALT-001**: Keep class-based architecture with explicit method binding - rejected due to ongoing `this` binding complexity
- **ALT-002**: Use ES6 modules with exported functions instead of factory pattern - rejected due to lack of state encapsulation
- **ALT-003**: Implement hybrid approach with classes internally and factory wrappers - rejected due to unnecessary complexity

## 4. Dependencies

- **DEP-001**: TypeScript 5.x for proper closure type inference
- **DEP-002**: Vitest test framework compatibility with factory function patterns
- **DEP-003**: Vite bundler compatibility with functional module exports
- **DEP-004**: Existing DOM API integration patterns must be preserved

## 5. Files

- **FILE-001**: `src/modules/progress.ts` - ProgressTracker class to factory conversion
- **FILE-002**: `src/modules/search.ts` - SearchFilter class to factory conversion
- **FILE-003**: `src/modules/timeline.ts` - TimelineRenderer class to factory conversion
- **FILE-004**: `src/main.ts` - Update module instantiation and usage
- **FILE-005**: `src/modules/types.ts` - Add factory return type definitions
- **FILE-006**: `test/progress.test.ts` - Update test instantiation patterns
- **FILE-007**: `test/search.test.ts` - Update test instantiation patterns
- **FILE-008**: `test/storage.test.ts` - Update ProgressTracker usage patterns

## 6. Testing

- **TEST-001**: Unit tests for createProgressTracker() factory function with closure state validation
- **TEST-002**: Unit tests for createSearchFilter() factory function with filtering logic validation
- **TEST-003**: Unit tests for createTimelineRenderer() factory function with DOM rendering validation
- **TEST-004**: Integration tests verifying main.ts module coordination with factory functions
- **TEST-005**: Regression tests ensuring identical behavior to class-based implementation
- **TEST-006**: Callback system tests verifying event registration and notification patterns
- **TEST-007**: State immutability tests ensuring closure variables are properly encapsulated

## 7. Risks & Assumptions

- **RISK-001**: Potential TypeScript type inference issues with complex closure patterns
- **RISK-002**: Possible performance impact from closure creation overhead vs class instantiation
- **RISK-003**: DOM event handler binding may require careful attention during refactoring
- **ASSUMPTION-001**: Current test suite provides adequate coverage for API compatibility validation
- **ASSUMPTION-002**: Factory function pattern will improve code maintainability over class inheritance
- **ASSUMPTION-003**: All existing module interactions are properly captured in current API surface

## 8. Related Specifications / Further Reading

- [VBS GitHub Copilot Instructions](/.github/copilot-instructions.md) - Project architecture patterns and coding standards
- [Functional Programming Patterns in TypeScript](https://www.typescriptlang.org/docs/handbook/2/functions.html) - TypeScript function documentation
- [Factory Pattern Implementation Guide](https://refactoring.guru/design-patterns/factory-method) - Design pattern reference
