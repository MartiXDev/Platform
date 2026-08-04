# JavaScript and JSDoc changes in TypeScript 7

**Status date:** 2026-07-21.

Open this reference for `allowJs`, `checkJs`, JSDoc declarations, or mixed
JavaScript/TypeScript migration. Corsa intentionally aligns JavaScript checking
more closely with TypeScript and removes several legacy/Closure behaviors.

## Migration-impacting changes

- Constructor-function and prototype patterns are no longer recognized as
  classes; use `class`.
- Closure function syntax such as `function(string): void` is removed; use
  `(value: string) => void`.
- Standalone `?` JSDoc types are removed; use an explicit supported type.
- Value names in type positions require `typeof`.
- `@enum` no longer receives special Closure semantics.
- Rest behavior requires JavaScript rest syntax; a variadic JSDoc annotation
  alone does not create a rest parameter.
- Top-level and nested expando patterns are stricter.
- Template-literal type inference consumes full Unicode code points rather than
  splitting surrogate pairs.
- Under `strict: false`, parameters typed `undefined`, `unknown`, or `any` can no
  longer be omitted merely because of their type.

## Review route

1. Run the existing TS6/checkJs baseline and record suppressed diagnostics.
2. Replace legacy constructor and Closure syntax with modern JavaScript/JSDoc.
3. Run TS7 and inspect declaration output from JavaScript separately.
4. Add explicit runtime tests where the migration changes executable JavaScript.
5. Avoid promising byte-for-byte `.d.ts` identity; verify semantic consumer
   compatibility.

Source: [Corsa intentional changes](https://github.com/microsoft/typescript-go/blob/main/CHANGES.md).
