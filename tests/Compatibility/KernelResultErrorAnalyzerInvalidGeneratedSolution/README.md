# KernelResultErrorAnalyzerInvalidGeneratedSolution

This temporary consumer intentionally contains compile-time error-code
violations. `node eng/verify-kernel.mjs` restores it only from the isolated
local package feed and verifies that warnings-as-errors produces `MXP001` and
`MXP002`.
