# Compiler diagnostics map

## Correctness first

- **Project typecheck command:** first reproduction and completion gate.
- **`tsc --showConfig`:** inspect the effective config after `extends`.
- **`tsc --explainFiles`:** explain why files and libraries enter the program.
- **`tsc --traceResolution`:** diagnose module and type-resolution choices.
- **`tsc --extendedDiagnostics`:** compare phase time, files, symbols, types,
  and memory.
- **`tsc --generateTrace <dir>`:** capture a deep trace for focused performance
  analysis.
- **`tsc --build --verbose`:** inspect project-reference build decisions.

Use the installed compiler's help and docs before relying on a flag across major
versions.

## Performance sequence

1. Reproduce with the real project command.
2. Record compiler version, machine, cold/warm state, elapsed time, and memory.
3. Inspect program size and configuration before rewriting types.
4. Narrow the expensive package or type relationship.
5. Make one change and repeat the same measurement.
6. Keep the change only when the evidence and correctness checks improve.

## TypeScript 7 parallel controls

- `--checkers` controls type-checker workers; more workers can improve throughput
  and increase memory.
- `--builders` controls concurrent project-reference builders and multiplies
  potential checker concurrency.
- `--singleThreaded` supports constrained CI, debugging, and controlled
  comparisons.

Worker tuning is environment-specific. Account for external CI or monorepo
parallelism before increasing internal concurrency.
