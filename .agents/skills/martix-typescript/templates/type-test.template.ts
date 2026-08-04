type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;

type Expect<Value extends true> = Value;

export function first<const Values extends readonly unknown[]>(
  values: Values,
): Values[0] | undefined {
  return values[0];
}

const value = first(["ready", "pending"] as const);
type PreservesLiteralUnion = Expect<
  Equal<typeof value, "ready" | undefined>
>;

// @ts-expect-error -- first accepts a readonly array/tuple, not an arbitrary scalar.
first(42);

export type { PreservesLiteralUnion };
