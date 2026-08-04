# TUnit dependency injection construction

## Purpose

Govern how TUnit constructs test class instances through the two supported DI
mechanisms: the low-level `IClassConstructor` interface and the higher-level
`DependencyInjectionDataSourceAttribute<TScope>` abstract base class. This rule
covers when to choose each mechanism, how scopes are created and disposed, safe
service-lifetime patterns, and how event receiver interfaces complement
constructor-based DI for teardown. It does **not** cover property injection via
`[ClassDataSource<T>]` or other data-source attributes; those belong in
[lifecycle-property-injection.md](./lifecycle-property-injection.md). Hook
attributes are covered in [lifecycle-hooks.md](./lifecycle-hooks.md).

## Default guidance

### Choosing between property injection and constructor DI

Use **property injection** (`[ClassDataSource<T>]`, `[MethodDataSource]`) as
the default. It is AOT-compatible, does not require a custom constructor, and
lets TUnit manage full lifecycle tracking automatically.

Use **`IClassConstructor`** or **`DependencyInjectionDataSourceAttribute<TScope>`**
when the test class has a constructor with typed parameters and those parameters
must be resolved from a DI container or through custom logic.

| Need | Preferred mechanism |
|---|---|
| Inject a typed fixture with controlled sharing | `[ClassDataSource<T>(Shared = ...)]` on a property |
| Full DI container with scoped lifetimes | `DependencyInjectionDataSourceAttribute<TScope>` |
| Lightweight or custom construction logic | `IClassConstructor` |
| Disposal / cleanup tied to test end | Either — implement `IAsyncDisposable` on scope, or use `ITestEndEventReceiver` on the constructor class |

### `IClassConstructor`

`IClassConstructor` gives direct control over how test class instances are
created. It is appropriate when you need custom instantiation logic, such as
resolving from a lightweight container, wrapping construction in a decorator,
or creating instances through a factory that the standard reflection path cannot
satisfy.

Register the constructor with `[ClassConstructor<T>]` on the test class. TUnit
creates a fresh attribute instance per test, so state stored on the constructor
class is per-test-safe.

```csharp
public class CustomConstructor : IClassConstructor
{
    public Task<object> Create(
        [DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicConstructors)]
        Type type,
        ClassConstructorMetadata classConstructorMetadata)
    {
        // Resolve the type however you like.
        return Task.FromResult(Activator.CreateInstance(type)!);
    }
}

[ClassConstructor<CustomConstructor>]
public class MyTestClass(SomeDependency dep)
{
    [Test]
    public async Task MyTest()
    {
        // dep was provided by CustomConstructor.Create()
    }
}
```

`ClassConstructorMetadata` provides test-level context (data-source arguments,
test metadata) that custom factories can use for conditional resolution.

### Disposing after test completion with `ITestEndEventReceiver`

Implement `ITestEndEventReceiver` on the same class as `IClassConstructor` to
dispose the scope or any resources created during `Create`. The event fires
after `[After(Test)]` hooks (Late stage by default):

```csharp
public class DependencyInjectionClassConstructor : IClassConstructor, ITestEndEventReceiver
{
    private readonly IServiceProvider _serviceProvider = CreateServiceProvider();
    private AsyncServiceScope _scope;

    public Task<object> Create(
        [DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicConstructors)]
        Type type,
        ClassConstructorMetadata classConstructorMetadata)
    {
        _scope = _serviceProvider.CreateAsyncScope();
        return Task.FromResult(_scope.ServiceProvider.GetRequiredService(type));
    }

    public async ValueTask OnTestEnd(TestContext context)
    {
        await _scope.DisposeAsync();
    }
}
```

Using `ITestEndEventReceiver` for teardown is preferred over implementing
`IDisposable` on the constructor class because the event fires at a well-defined
point in the execution order, after all instance cleanup hooks have run.

### `DependencyInjectionDataSourceAttribute<TScope>`

For full DI-container integration, extend `DependencyInjectionDataSourceAttribute<TScope>`.
This abstract base class handles scope lifecycle automatically. You supply:

1. **`CreateScope`** — called once per test class instance; returns a new
   container scope.
2. **`Create`** — called once per constructor parameter; resolves a service by
   type from the scope.

The framework disposes the scope at the appropriate point in the test lifecycle.

```csharp
public class MicrosoftDIAttribute : DependencyInjectionDataSourceAttribute<IServiceScope>
{
    private static readonly IServiceProvider ServiceProvider = BuildProvider();

    public override IServiceScope CreateScope(DataGeneratorMetadata dataGeneratorMetadata)
    {
        return ServiceProvider.CreateScope();
    }

    public override object? Create(IServiceScope scope, Type type)
    {
        return scope.ServiceProvider.GetService(type);
    }

    private static IServiceProvider BuildProvider()
    {
        return new ServiceCollection()
            .AddSingleton<IUserRepository, UserRepository>()
            .AddTransient<IEmailService, FakeEmailService>()
            .BuildServiceProvider();
    }
}
```

Apply the attribute to the test class:

```csharp
[MicrosoftDI]
public class UserServiceTests(IUserRepository repo, IEmailService email)
{
    [Test]
    public async Task CreateUser_SendsWelcomeEmail()
    {
        var service = new UserService(repo, email);
        await service.CreateAsync("alice@example.com");
        await Assert.That(((FakeEmailService)email).SentCount).IsEqualTo(1);
    }
}
```

The same pattern works with any DI container. Replace `IServiceScope` with the
container's own scope type (e.g., `ILifetimeScope` for Autofac) and implement
`CreateScope` and `Create` accordingly.

### Safe service-lifetime patterns

- **Transient services** are safe to resolve per test because each test gets
  its own scope via `CreateScope`. Do not share transient instances across
  multiple tests.
- **Scoped services** are tied to the scope returned by `CreateScope`. They live
  for the duration of one test and are disposed when the scope is disposed.
- **Singleton services** that are registered inside the test's own
  `ServiceCollection` (as in the example above) are per-test-session, not
  process-wide. If the test accesses a true process-wide singleton (e.g., a
  shared database), use `[ClassDataSource<T>(Shared = SharedType.PerTestSession)]`
  instead of registering it in the DI container so TUnit controls its lifecycle.
- Because TUnit runs tests **in parallel by default**, avoid shared mutable
  state in singleton registrations. Either make the service thread-safe or scope
  the registration to the test.

## Avoid

- **Resolving services manually inside test bodies.** Inject them through the
  constructor instead so TUnit manages the scope lifetime.
- **Registering singletons that hold mutable state per test.** In a parallel
  test run, a shared singleton will receive concurrent writes. Use `Transient`
  or `Scoped` lifetimes, or move to `[ClassDataSource<T>]` with an appropriate
  `SharedType`.
- **Implementing `IDisposable` on the constructor class as the sole cleanup
  path.** TUnit will not reliably call `Dispose` on the constructor class at
  a predictable point. Use `ITestEndEventReceiver` for deterministic teardown.
- **Combining `IClassConstructor` and `[ClassDataSource<T>]` on the same test
  class property.** These are orthogonal mechanisms. Mix them only when you
  have a clear ownership boundary: the constructor manages the class instance;
  property injection manages individual data-source objects.
- **Hiding the DI scope inside a static field on the attribute.** Each attribute
  instance is per-test; the scope must be an instance field. A static scope
  becomes a cross-test singleton and breaks isolation.
- **Using `DependencyInjectionDataSourceAttribute<TScope>` for simple, non-DI
  construction.** Prefer `IClassConstructor` for lightweight cases — the base
  class adds overhead that is unnecessary outside of real DI containers.

## Review checklist

- [ ] Test class constructor parameters are resolved through
      `IClassConstructor` or `DependencyInjectionDataSourceAttribute<TScope>`,
      not through manual `new` expressions inside test bodies.
- [ ] The DI scope is an **instance field**, not a static field, on the
      constructor or attribute class.
- [ ] Singleton-lifetime registrations inside the test container are
      thread-safe or have no shared mutable state.
- [ ] Scope disposal is handled by `ITestEndEventReceiver` on the constructor
      class, or the framework disposes it via `DependencyInjectionDataSourceAttribute`
      — not by relying on `IDisposable`.
- [ ] The choice between property injection and constructor DI is documented in
      a comment when it is non-obvious (e.g., when a real DI container is
      justified over a simple fixture).
- [ ] No process-wide singletons are passed through the constructor DI scope
      unless they are provably immutable.

## Related files

- [lifecycle-property-injection.md](./lifecycle-property-injection.md) —
  `[ClassDataSource<T>]`, `IAsyncInitializer`, `IAsyncDiscoveryInitializer`,
  nested graphs, and event receiver interfaces
- [lifecycle-hooks.md](./lifecycle-hooks.md) —
  `[Before]` / `[After]` hook attributes, execution order, exception aggregation
- [execution-parallelism.md](./execution-parallelism.md) —
  parallel-by-default behavior and how it affects shared DI state
- [references/lifecycle-map.md](../references/lifecycle-map.md) —
  quick-reference entry map for the lifecycle domain

## Source anchors

- [TUnit — Dependency Injection](https://tunit.dev/docs/writing-tests/dependency-injection)
  — `IClassConstructor` signature and `ClassConstructorMetadata`, `DependencyInjectionDataSourceAttribute<TScope>`
  with Microsoft DI and Autofac examples, and the choosing-between-the-two table.
- [TUnit — Event Subscribing](https://tunit.dev/docs/writing-tests/event-subscribing)
  — `ITestEndEventReceiver` on a class constructor for scope disposal,
  `EventReceiverStage`, and the full list of available event receiver interfaces.
- [TUnit — Test Lifecycle](https://tunit.dev/docs/writing-tests/lifecycle)
  — full execution order table showing where constructor creation, property
  injection, and `IAsyncInitializer` fit relative to hooks.
- [TUnit — Property Injection](https://tunit.dev/docs/writing-tests/property-injection)
  — `DependencyInjectionDataSourceAttribute<TScope>` mentioned as the bridge
  between property injection and DI containers.
