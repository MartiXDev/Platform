# MartiX.Platform

`MartiX.Platform` is the framework-independent MartiX Platform Kernel. It
contains the transport-neutral `Result`, `Result<T>`, `Error`, and `ErrorKind`
contracts in `MartiX.Platform.Results`.

The package has no hosting, dependency-injection, logging, JSON, ASP.NET Core,
EF Core, or third-party dependency. Its result and error types are immutable
factory-created reference types. HTTP, jobs, CLI, module calls, and messaging
adapt these contracts at their outward boundaries.
