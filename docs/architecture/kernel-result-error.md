# Platform Kernel Result/Error Contract

The `MartiX.Platform` package is the BCL-only Platform Kernel. Its public
namespace is `MartiX.Platform.Results`; it has no hosting, dependency
injection, logging, JSON, ASP.NET Core, EF Core, or third-party dependency.

`Result` represents success without a value or failure with one or more
`Error` values. `Result<T>` represents success with a non-null value or failure
with one or more `Error` values. The factory-created sealed reference types
make these states explicit:

- success has no errors;
- failure has at least one error and no value;
- failure errors are defensively copied and exposed through a read-only list;
- reading `Result<T>.Value` on failure throws `InvalidOperationException`;
- invalid codes, kinds, descriptions, targets, null values, and null errors are
  rejected at construction.

Error codes use lowercase owner-prefixed dot-separated segments such as
`orders.not-found`. The `platform.*` prefix is reserved for Platform-owned
errors. `ErrorKind` uses transport-independent categories with explicit stable
values: `Validation`, `RuleViolation`, `NotFound`, `Conflict`,
`AuthenticationRequired`, `Forbidden`, `RateLimited`, `Unavailable`, and
`Unexpected`.

The checked-in API and package-content baselines are
`tests/Compatibility/MartiX.Platform.public-api.txt` and
`tests/Compatibility/MartiX.Platform.package-content.json`. The packed
consumer acceptance seam is
`tests/Compatibility/KernelResultErrorGeneratedSolution/`; it is executed by
`node eng/verify-kernel.mjs`.
