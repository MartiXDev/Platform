# TUnit assertions map

## Purpose

Map the TUnit assertions topics covered by this workstream so rule files stay
aligned with the official docs and point agents at the right companion guidance.
Assertions covers the `Assert.That` entry point, the async assertion model and
unawaited-assertion pitfall, the full value and collection assertion surface,
async and exception assertions, combining assertions with `.And` / `.Or` chains
and `Assert.Multiple`, member assertions, and custom assertion extensibility.

## Rule coverage

- **Assertion fundamentals and the async model**
  - Rule file: `rules/assertions-fundamentals.md`
  - Primary sources:
    - [Getting started with assertions](https://tunit.dev/docs/assertions/getting-started)
    - [Awaiting assertions](https://tunit.dev/docs/assertions/awaiting)
  - Notes: Use for the `TUnit.Assertions` NuGet package, the `Assert.That`
    entry point, why every assertion returns an awaitable and must be
    `await`ed, and the unawaited-assertion pitfall (an unawaited assertion
    silently passes — it does **not** throw). This is the highest-risk
    pitfall in the TUnit assertion model; lead with it.

- **Value, collection, and type assertions**
  - Rule file: `rules/assertions-value-collection-async.md`
  - Primary sources:
    - [Equality and comparison](https://tunit.dev/docs/assertions/equality-and-comparison)
    - [Null and default](https://tunit.dev/docs/assertions/null-and-default)
    - [Boolean](https://tunit.dev/docs/assertions/boolean)
    - [Numeric](https://tunit.dev/docs/assertions/numeric)
    - [String](https://tunit.dev/docs/assertions/string)
    - [DateTime](https://tunit.dev/docs/assertions/datetime)
    - [Types](https://tunit.dev/docs/assertions/types)
    - [Specialized types](https://tunit.dev/docs/assertions/specialized-types)
    - [Collections](https://tunit.dev/docs/assertions/collections)
    - [Dictionaries](https://tunit.dev/docs/assertions/dictionaries)
    - [Tasks and async](https://tunit.dev/docs/assertions/tasks-and-async)
    - [Exceptions](https://tunit.dev/docs/assertions/exceptions)
    - [Delegates](https://tunit.dev/docs/assertions/delegates)
    - [Regex assertions](https://tunit.dev/docs/assertions/regex-assertions)
    - [Type checking](https://tunit.dev/docs/assertions/type-checking)
    - [Assertion library reference](https://tunit.dev/docs/assertions/library)
  - Notes: Use for the full value-assertion surface, collection and
    dictionary checks, async delegate assertions, `Throws<T>()` for both
    sync and async delegates (not `ThrowsAsync`), and regex / type-checking
    assertions. `Throws<T>()` accepts both synchronous and asynchronous
    delegates; the `ThrowsAsync` method does not exist in TUnit.

- **Combining assertions and custom extensibility**
  - Rule file: `rules/assertions-combining-custom.md`
  - Primary sources:
    - [Combining assertions](https://tunit.dev/docs/assertions/combining-assertions)
    - [Member assertions](https://tunit.dev/docs/assertions/member-assertions)
    - [Custom assertions](https://tunit.dev/docs/assertions/extensibility/custom-assertions)
    - [Source generator assertions](https://tunit.dev/docs/assertions/source-generator-assertions)
    - [Extensibility — chaining and converting](https://tunit.dev/docs/assertions/extensibility-chaining-and-converting)
    - [Extensibility — returning items from await](https://tunit.dev/docs/assertions/extensibility-returning-items-from-await)
  - Notes: Use for `.And` / `.Or` chaining, `Assert.Multiple()` for
    collecting all assertion failures rather than stopping at first, member
    assertions for property-level drill-down, and the extension interfaces
    for custom assertion authoring.

## High-risk pitfalls

| Pitfall | Consequence | Guidance |
|---|---|---|
| Unawaited `Assert.That(...)` | Assertion silently passes; the test passes even when the condition is false | Always `await` every assertion; use `await using var _ = Assert.Multiple(...)` for batched assertions |
| Using `ThrowsAsync<T>()` | Compilation error; the method does not exist in TUnit | Use `await Assert.That(async () => await action()).Throws<TException>()` instead |
| Expecting `IsEqualTo` to compare reference | Wrong comparison type chosen | Use `IsSameReferenceAs` for reference equality; `IsEqualTo` for value/structural equality |

## Related files

- [Assertions fundamentals rule](../rules/assertions-fundamentals.md)
- [Value, collection, and async assertions rule](../rules/assertions-value-collection-async.md)
- [Combining and custom assertions rule](../rules/assertions-combining-custom.md)
- [Migration attribute matrix](./migration-attribute-matrix.md)
- [Source index and guardrails](./doc-source-index.md)

## Source anchors

- [Getting started with assertions](https://tunit.dev/docs/assertions/getting-started)
  - `TUnit.Assertions` package installation and `Assert.That` entry point.
- [Awaiting assertions](https://tunit.dev/docs/assertions/awaiting)
  - Async assertion model; why assertions must be awaited; unawaited pitfall.
- [Combining assertions](https://tunit.dev/docs/assertions/combining-assertions)
  - `.And` / `.Or` chains and `Assert.Multiple()` semantics.
- [Member assertions](https://tunit.dev/docs/assertions/member-assertions)
  - Property-level drill-down assertion API.
- [Exceptions](https://tunit.dev/docs/assertions/exceptions)
  - `Throws<T>()`, `ThrowsExactly<T>()`, `.WithMessage()`, and exception
    chain assertions.
- [Tasks and async](https://tunit.dev/docs/assertions/tasks-and-async)
  - Async delegate assertions and task completion checks.
- [Assertion library reference](https://tunit.dev/docs/assertions/library)
  - Full assertion method inventory; use to verify method signatures before
    recommending a specific assertion overload.
- [Custom assertions](https://tunit.dev/docs/assertions/extensibility/custom-assertions)
  - Extension interface for adding domain-specific assertion methods.

## Maintenance notes

- The unawaited-assertion pitfall must remain the opening statement in the
  `assertions-fundamentals` rule and must be referenced from every assertion
  rule. Do not bury it in a sub-section.
- `IsSameReferenceAs` and `IsNotSameReferenceAs` are present in the TUnit
  assertion library even though the earlier seed-skill harvest left them
  unverified. Keep reference-equality guidance aligned with the official
  assertion library surface.
- `Assert.Multiple()` changes the failure model: all assertions in the block
  run regardless of individual failures; keep this distinction explicit in the
  combining rule.
- When the TUnit assertion library adds new assertion families, add entries to
  the `## Rule coverage` section and update the relevant rule before shipping.
- The full assertion API reference at `/assertions/library` is the authoritative
  list of available methods. Consult it before recommending any assertion
  overload not already covered in the rules.
