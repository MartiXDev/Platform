# MartiX.TemplateTestApp agent routing

- API composition root: `src/MartiX.TemplateTestApp.Api/Program.cs`
- Migrator: `src/MartiX.TemplateTestApp.Migrator/Program.cs`
- Manifest: `martix.platform.json`
- Preset: `modular-monolith`
- Tests: `tests/MartiX.TemplateTestApp.Tests`

Keep module registration, endpoint mapping, Contracts, and dependency direction
explicit. A Business Module may consume only another module's Contracts
namespace, never its Domain, Features, or Infrastructure. It owns direct
DbContext operations, persistence mappings, migrations, and migration history;
do not add repositories or `IUnitOfWork`.
