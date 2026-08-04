# TUnit.Mocks — source-generated mocking

## Purpose

Guide the use of `TUnit.Mocks`, its companion packages, and the mock lifecycle
so agents do not assume availability, cargo-cult Moq or NSubstitute patterns, or
use stale API surface from pre-beta builds.

## Default guidance

### Gate checks — confirm before generating any mocking code

- `TUnit.Mocks` is **beta** and requires **C# 14** (`<LangVersion>14</LangVersion>`
  or `preview`). If the project targets an earlier language version, the
  compiler raises **TM004** at build time. Do not emit `TUnit.Mocks` code unless
  you have confirmed both conditions are met.
- Add only the package(s) the project actually needs:
  - `TUnit.Mocks` — core mocking (interfaces, abstract classes, delegates,
    partial concrete classes via `Mock.OfPartial<T>`)
  - `TUnit.Mocks.Http` — `Mock.HttpHandler()` and `Mock.HttpClient()` for
    `HttpClient` / `DelegatingHandler` mocking
  - `TUnit.Mocks.Logging` — `Mock.Logger()` / `Mock.Logger<T>()` for
    `ILogger` / `ILogger<T>` mocking
- `TUnit.Mocks` has **no dependency on the TUnit test runner**. It works with
  xUnit, NUnit, MSTest, or standalone. Do not imply it requires TUnit tests.

### Creating mocks

- Use `Mock.Of<T>()` to mock an interface or abstract class. It returns a
  `Mock<T>` wrapper; the live `T` instance is accessed via `.Object` or via
  implicit conversion.
- Use `Mock.OfPartial<T>(args)` to mock a concrete class; unconfigured methods
  call the real implementation.
- Use `Mock.OfDelegate<T>()` for `Func<>` or `Action<>` delegates.
- Use `Mock.Wrap<T>(instance)` to wrap a real object with selective overrides.
- Use `Mock.Of<T1, T2>()` when a single mock must implement multiple interfaces.
- Pass `MockBehavior.Strict` to throw `MockStrictBehaviorException` on any
  unconfigured call. Loose mode (default) returns smart defaults (`0`, `""`,
  `false`, `null`, auto-mocked interfaces).

### Setup and verification

Setup and verification share the same generated extension methods on `Mock<T>`.
The _last_ chain method determines the intent:

```csharp
var mock = Mock.Of<IEmailService>();

// Setup — .Returns() configures a return value
mock.Send(Any()).Returns(true);

// Setup — .Throws() configures an exception
mock.Send(Any()).Throws(new SmtpException("unavailable"));

// Verification — .WasCalled() asserts the interaction
mock.Send("alice@example.com").WasCalled(Times.Once);
mock.Send(Any()).WasCalled(Times.AtLeast(2));
mock.Send(Any()).WasNotCalled();
```

### Argument matchers

- **No `Arg.` prefix** — matchers are imported globally via TUnit.Mocks.
- `Any()` matches any value.
- Raw values use implicit exact matching: `mock.GetUser(42)`.
- Lambda predicates match inline without a wrapper: `mock.GetUser(id => id > 0)`.
- `Is<T>(predicate)` is the explicit form when the implicit lambda is ambiguous.
- Mix matchers and raw values in the same call: `mock.Search(s => s.Length > 0, Any())`.

### HTTP and logging mocks

```csharp
// Requires TUnit.Mocks.Http
var client = Mock.HttpClient("https://api.example.com");
client.Handler.Get("/users").Returns(new HttpResponseMessage(HttpStatusCode.OK));

// Requires TUnit.Mocks.Logging
var logger = Mock.Logger<MyService>();
// verify log output after act
logger.Logged(LogLevel.Error, msg => msg.Contains("failed")).WasCalled(Times.Once);
```

### Source-generated mocks

Mocks are generated at compile time via the TUnit source generator. This means
they are **AOT-compatible** and work with trimming and single-file publishing.
The generated code appears in the project's intermediate output as
`*.TUnit.Mocks.g.cs` files. Do not edit generated files.

## Avoid

- Do not emit `TUnit.Mocks` code when the project is on C# 13 or earlier;
  suggest upgrading `<LangVersion>` first and confirm the change is acceptable
  to the team.
- Do not assume `TUnit.Mocks.Http` or `TUnit.Mocks.Logging` are available
  unless both packages are referenced in the project file.
- Do not copy Moq or NSubstitute setup patterns (`It.IsAny<T>()`, `.Setup()`,
  `.Verify()`, `.Returns()`-off-a-setup-chain) — `TUnit.Mocks` uses a
  different generated API.
- Do not call `.WasCalled()` inside `Assert.Multiple()` if you also have
  `await Assert.That(...)` assertions in the same block; mixing assertion styles
  in a single block reduces clarity.
- Do not mock concrete types that have no virtual members; `Mock.OfPartial<T>`
  requires that at least the members being overridden are virtual or abstract.
- Do not rely on `TUnit.Mocks` API stability across beta releases; warn the
  team when upgrading the package that method signatures may change.

## Review checklist

- [ ] Project targets C# 14 (`<LangVersion>14</LangVersion>` or `preview`) before any `TUnit.Mocks` code is added.
- [ ] Only the actually needed sub-packages (`TUnit.Mocks`, `TUnit.Mocks.Http`, `TUnit.Mocks.Logging`) are referenced.
- [ ] Each mock is created with the appropriate factory (`Mock.Of<T>`, `Mock.OfPartial<T>`, `Mock.OfDelegate<T>`, `Mock.Wrap<T>`).
- [ ] Setup calls end in `.Returns()` or `.Throws()` and verification calls end in `.WasCalled()` or `.WasNotCalled()`.
- [ ] Argument matchers use TUnit.Mocks conventions (`Any()`, inline lambdas, raw values) — not Moq or NSubstitute conventions.
- [ ] Mock behavior mode (`Loose` / `Strict`) is a deliberate choice, not an implicit default.

## Related files

- [Extending extension points rule](./extending-extension-points.md)
- [Assertions fundamentals rule](./assertions-fundamentals.md)
- [Mocking and extending map](../references/mocking-extending-map.md)

## Source anchors

- [TUnit.Mocks overview](https://tunit.dev/docs/writing-tests/mocking/)
- [TUnit.Mocks setup and stubbing](https://tunit.dev/docs/writing-tests/mocking/setup)
- [TUnit.Mocks verification](https://tunit.dev/docs/writing-tests/mocking/verification)
- [TUnit.Mocks argument matchers](https://tunit.dev/docs/writing-tests/mocking/argument-matchers)
- [TUnit.Mocks advanced features](https://tunit.dev/docs/writing-tests/mocking/advanced)
- [TUnit.Mocks HTTP mocking](https://tunit.dev/docs/writing-tests/mocking/http)
- [TUnit.Mocks logging](https://tunit.dev/docs/writing-tests/mocking/logging)
