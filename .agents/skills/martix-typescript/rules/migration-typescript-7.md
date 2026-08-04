# TypeScript 7 migration

## Purpose

Move TypeScript 5.x or 6.x projects to the native TypeScript 7 compiler while
separating compiler compatibility from compiler-API ecosystem compatibility.

## Default guidance

1. Record the current compiler, package manager, config graph, checks, and
   declaration artifacts.
2. Move to TypeScript 6.0 first when migrating from 5.x; clear deprecations
   without hiding them through `ignoreDeprecations`.
3. Use TS6 `stableTypeOrdering` only while comparing TS6 and TS7 output.
4. Replace removed options and make new `rootDir` and `types` behavior explicit.
5. Run the same checks on TS6 and TS7; compare diagnostics and consumer-visible
   declarations.
6. Inventory tools that import the compiler API or embed TypeScript before
   changing their dependency.

## Decision branches

- Plain Node or bundler project without compiler-API consumers: TS7 can be the
  primary compiler after config and checks pass.
- Framework or tool with embedded TypeScript: verify its current support and
  keep TS6 where required.
- Tool importing `typescript`: use the official TS6 compatibility package or
  aliases only when the dependency graph requires it.
- Declaration-producing library: add consumer compilation and declaration diff
  review to the migration gate.

## Review checklist

- [ ] Removed options are replaced based on the host.
- [ ] `rootDir` and required global `types` are explicit.
- [ ] TS6 and TS7 commands are not confused in scripts or CI.
- [ ] Compiler-API consumers have an evidenced compatibility plan.
- [ ] Declaration differences are reviewed for semantics, not only text order.

## Related files

- [TypeScript 7 compatibility map](../references/typescript-7-compatibility-map.md)
- [Compiler API compatibility](./tooling-api-compatibility.md)
- [Project configuration](./config-project-shape.md)

## Source anchors

- [TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [TypeScript 6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
