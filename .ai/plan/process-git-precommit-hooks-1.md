---
goal: Add comprehensive Git pre-commit hook support with automatic linting and formatting using simple-git-hooks and lint-staged
version: 1.0
date_created: 2025-08-01
last_updated: 2025-08-01
owner: Marcus R. Brown (marcusrbrown)
status: Planned
tags: [process, git, linting, formatting, hooks, workflow, quality]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan adds comprehensive Git pre-commit hook support to the VBS (View By Stardate) project using `simple-git-hooks` and `lint-staged`. The system will automatically run ESLint with fixes and Prettier formatting on staged files before commits, ensuring consistent code quality and preventing poorly formatted code from entering the repository.

## 1. Requirements & Constraints

**Quality Requirements:**

- **REQ-001**: Must use latest stable versions of simple-git-hooks (v2.13.1) and lint-staged (v16.1.2)
- **REQ-002**: Must integrate with existing ESLint configuration (@bfra.me/eslint-config)
- **REQ-003**: Must integrate with existing Prettier configuration (@bfra.me/prettier-config)
- **REQ-004**: Must only process staged files to maintain performance
- **REQ-005**: Must prevent commits if linting errors cannot be auto-fixed

**Project Constraints:**
- **CON-001**: Must use pnpm as package manager (existing constraint)
- **CON-002**: Must maintain existing TypeScript/Vite build pipeline
- **CON-003**: Must not interfere with existing test runner (Vitest)
- **CON-004**: Must respect existing ESLint ignore patterns in eslint.config.ts

**Integration Guidelines:**
- **GUD-001**: Follow existing VBS project patterns for configuration files
- **GUD-002**: Use self-explanatory code commenting standards per project instructions
- **GUD-003**: Maintain compatibility with VS Code development workflow

**Security Patterns:**
- **SEC-001**: Validate hook installation to prevent malicious script execution
- **SEC-002**: Use exact package versions to prevent supply chain attacks

## 2. Implementation Steps

### Implementation Phase 1: Package Installation and Basic Setup

- **GOAL-001**: Install and configure simple-git-hooks and lint-staged packages with proper integration

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Install simple-git-hooks@2.13.1 and lint-staged@16.1.2 as devDependencies using pnpm | ✅ | 2025-08-01 |
| TASK-002 | Add prepare script to package.json for automatic hook installation | ✅ | 2025-08-01 |
| TASK-003 | Add lint-staged script to package.json scripts section | ✅ | 2025-08-01 |
| TASK-004 | Configure lint-staged in package.json ("lint-staged" object) or create lint-staged.config.ts file | ✅ | 2025-08-01 |

### Implementation Phase 2: Hook Configuration and Integration

- **GOAL-002**: Configure Git hooks and integrate with existing linting/formatting tools

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Configure simple-git-hooks in package.json with pre-commit hook | ✅ | 2025-08-01 |
| TASK-006 | Create lint-staged rules using single `eslint --fix` command for all supported file types (.ts, .js, .json, .md, .css, .yaml) | ✅ | 2025-08-01 |
| TASK-007 | Test hook installation and execution with sample changes | ✅ | 2025-08-01 |
| TASK-008 | Verify integration with existing @bfra.me/eslint-config which handles both linting and formatting via Prettier | ✅ | 2025-08-01 |

### Implementation Phase 3: Testing and Documentation

- **GOAL-003**: Validate complete workflow and update project documentation

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Create comprehensive test scenarios for hook functionality | ✅ | 2025-08-01 |
| TASK-010 | Test hook behavior with linting errors, formatting issues, and clean code | ✅ | 2025-08-01 |
| TASK-011 | Update .github/copilot-instructions.md with new Git workflow knowledge | ✅ | 2025-08-01 |
| TASK-012 | Add bypass mechanism documentation for emergency commits | ✅ | 2025-08-01 |

## 3. Alternatives

**Alternative approaches considered:**

- **ALT-001**: Husky - More popular but heavier and Node.js focused; simple-git-hooks is lighter and more suitable for this TypeScript project
- **ALT-002**: Pre-commit framework (Python-based) - Language agnostic but adds Python dependency; simple-git-hooks better fits existing Node.js ecosystem
- **ALT-003**: Manual git hooks - More control but harder to share and maintain across team; package-based solution ensures consistency
- **ALT-004**: GitHub Actions only - CI/CD approach but slower feedback; local hooks provide immediate feedback

## 4. Dependencies

**Package Dependencies:**
- **DEP-001**: simple-git-hooks@2.13.1 - Git hook management
- **DEP-002**: lint-staged@16.1.2 - Staged file processing
- **DEP-003**: Existing eslint@^9.31.0 - Code linting (already installed)
- **DEP-004**: Existing prettier@^3.0.0 - Code formatting (already installed)

**System Dependencies:**
- **DEP-005**: Git repository (initialized) - Required for hook installation
- **DEP-006**: Node.js and pnpm - Package management and script execution

## 5. Files

**New Configuration Files:**
- **FILE-001**: `lint-staged.config.ts` or package.json "lint-staged" section - Lint-staged configuration with file type rules
- **FILE-002**: Package.json additions - Scripts and hook configurations

**Modified Files:**
- **FILE-003**: `package.json` - Add dependencies, scripts, and simple-git-hooks config
- **FILE-004**: `.github/copilot-instructions.md` - Add Git workflow documentation

**Generated Files:**
- **FILE-005**: `.git/hooks/pre-commit` - Auto-generated by simple-git-hooks

## 6. Testing

**Functional Tests:**
- **TEST-001**: Verify hook installation after `pnpm install`
- **TEST-002**: Test pre-commit hook execution with TypeScript files containing linting errors
- **TEST-003**: Test pre-commit hook execution with formatting issues in various file types
- **TEST-004**: Test commit blocking when unfixable linting errors exist
- **TEST-005**: Test successful commit when all files pass linting and formatting

**Integration Tests:**
- **TEST-006**: Verify compatibility with existing `pnpm lint` and `pnpm fix` commands
- **TEST-007**: Test hook execution doesn't interfere with existing test runners
- **TEST-008**: Verify hook respects existing ESLint ignore patterns

**Edge Case Tests:**
- **TEST-009**: Test hook behavior with no staged files
- **TEST-010**: Test bypass mechanism using `git commit --no-verify`
- **TEST-011**: Test hook behavior with binary files and non-code files

## 7. Risks & Assumptions

**Technical Risks:**
- **RISK-001**: Hook installation may fail on different operating systems (Windows/macOS/Linux)
- **RISK-002**: Performance impact on large commits with many staged files
- **RISK-003**: Potential conflicts with existing IDE formatting on save

**Process Risks:**
- **RISK-004**: Team members may be unfamiliar with bypassing hooks for emergency commits
- **RISK-005**: Hook failures may block legitimate commits requiring manual intervention

**Assumptions:**
- **ASSUMPTION-001**: All team members use Git for version control
- **ASSUMPTION-002**: Development team accepts pre-commit quality gates
- **ASSUMPTION-003**: Existing ESLint and Prettier configurations are stable and comprehensive
- **ASSUMPTION-004**: pnpm is consistently used across development environments

## 8. Related Specifications / Further Reading

[simple-git-hooks Documentation](https://github.com/toplenboren/simple-git-hooks)
[lint-staged Documentation](https://github.com/lint-staged/lint-staged)
[ESLint CLI and Rules](https://eslint.org/docs/user-guide/command-line-interface)
[Prettier Configuration](https://prettier.io/docs/en/configuration.html)
[Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
[VBS Project README](../../readme.md)
