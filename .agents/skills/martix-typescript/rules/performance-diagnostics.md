# Compiler performance diagnostics

## Purpose

Improve TypeScript feedback time from measured evidence without trading away
correctness, reproducibility, or CI memory stability.

## Default guidance

- Capture a repeatable baseline before changing compiler or type design.
- Use the project's real typecheck or `--build` command and record machine, CPU,
  memory limit, cold/warm state, and compiler version.
- Inspect `--extendedDiagnostics`, `--diagnostics`, traces, or build timing as
  appropriate.
- Reduce repeated type instantiation, pathological unions, and unnecessary
  project overlap before adding infrastructure complexity.
- Use project references for real package boundaries, not as a decorative
  optimization layer.
- Tune TS7 `--checkers` and `--builders` only against measured CPU and memory.

## Decision branches

- Single project: profile type relationships, file inclusion, and library checks.
- Monorepo: inspect the project graph, incremental artifacts, and duplicated
  source inclusion before builder parallelism.
- Memory-constrained CI: reduce workers or use `--singleThreaded` when
  reproducibility or resource limits outweigh throughput.
- Declaration-heavy library: inspect declaration emit and advanced type
  instantiation separately from runtime build steps.

## Review checklist

- [ ] Baseline and comparison use the same project and environment.
- [ ] The change improves a measured bottleneck.
- [ ] Worker counts fit CI memory and external parallelism.
- [ ] Correctness checks remain enabled.
- [ ] Reported gains are project-specific, not universal promises.

## Related files

- [Compiler diagnostics map](../references/compiler-diagnostics-map.md)
- [Project configuration](./config-project-shape.md)
- [Generics and advanced types](./language-generics-advanced-types.md)

## Source anchors

- [TypeScript performance wiki](https://github.com/microsoft/TypeScript/wiki/Performance)
- [TypeScript 7 parallelization controls](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#custom-scaling-parallelization-and-controls)
- [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html)
