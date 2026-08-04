# KernelResultErrorGeneratedSolution

This temporary, explicitly named Generated Solution is the primary acceptance
seam for the Platform Kernel Result/Error contract. It references the packed
`MartiX.Platform` and `MartiX.Platform.Analyzers` packages from an isolated
local feed and exercises immutable success, failure, error-category, error-code,
and invalid-construction behavior.

Run the packed consumer from the repository root:

```text
node eng/verify-kernel.mjs
```

The consumer is test-owned conformance behavior and is not distributed as
Platform product code.
