# TypeScript source index

**Baseline reviewed:** 2026-07-21.

Use primary sources for load-bearing compiler, runtime, and compatibility claims.
Re-check dated compatibility before changing version guidance.

| Topic | Primary source | Use for |
| --- | --- | --- |
| TypeScript 7 release | [Announcing TypeScript 7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) | Native compiler, defaults, removals, performance, parallelism, TS6 coexistence |
| TypeScript 6 transition | [TypeScript 6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html) | `stableTypeOrdering`, module migration, 6-to-7 bridge |
| Native compiler changes | [typescript-go CHANGES](https://github.com/microsoft/typescript-go/blob/main/CHANGES.md) | Intentional Strada/Corsa JavaScript and JSDoc differences |
| Compiler options | [TSConfig reference](https://www.typescriptlang.org/tsconfig/) | Current option semantics |
| Module behavior | [Module theory](https://www.typescriptlang.org/docs/handbook/modules/theory.html) | Host-aware resolution model |
| Project graph | [Project references](https://www.typescriptlang.org/docs/handbook/project-references.html) | `composite`, declarations, `tsc --build` |
| Declarations | [Declaration files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html) | Library shapes, publishing, authoring |
| Compiler performance | [Performance wiki](https://github.com/microsoft/TypeScript/wiki/Performance) | Profiling and type-system costs |
| Native Node execution | [Node.js TypeScript docs](https://nodejs.org/api/typescript.html) | Type stripping, syntax limits, module behavior |
| Typed lint compatibility | [typescript-eslint versions](https://typescript-eslint.io/users/dependency-versions/) | Supported compiler ranges and release lag |

## Source policy

- Prefer the project's installed-version documentation when behavior differs by
  version.
- Treat framework and tool compatibility as current status, not permanent fact.
- Keep examples executable and let compiler output outrank tutorial prose.
- Use secondary sources only for discovery or explicitly labeled comparison.
