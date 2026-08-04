# Module host map

TypeScript models a host; it does not define runtime resolution by itself.

- **Modern Node or Bun:** use `nodenext`. Check the nearest `package.json`
  `type`, source and output extensions, exports, and relative specifiers.
- **Bundler:** use `preserve` with `bundler`. Check alias parity, browser
  conditions, and absence of TypeScript-only runtime paths.
- **Direct Node type stripping:** use `nodenext`. Check `.ts` specifiers,
  erasable syntax, the `.tsx` exclusion, and absence of runtime `paths`.
- **Published package:** model the consumer host and export map. Confirm runtime
  and `types` conditions resolve to built artifacts.

## Common diagnosis

### Compiler resolves, runtime fails

Look for `paths` or source aliases that only TypeScript understands. Give the
runtime the same mapping or move the contract into package exports/subpath
imports.

### ESM import fails after emit

Check package `type`, source extension, emitted extension, and relative import
specifier as one system. A compiler-only fix can create a different runtime bug.

### Editor and build disagree

Confirm the editor uses the workspace compiler/config and that project
references have current declaration output.

### Package works from source but not after install

Compile a consumer fixture against the packed or built package. Verify every
export condition and declaration path exists.

## Native Node TypeScript

Node's built-in support strips erasable type syntax, performs no type checking,
and ignores `tsconfig` at runtime. It does not support `.tsx` and does not
transform enums, runtime namespaces, parameter properties, import aliases, or
decorators. Use a full runner such as `tsx` when the project requires transforms
or tsconfig-aware execution; keep typechecking as a separate command.

Source: [Node.js TypeScript documentation](https://nodejs.org/api/typescript.html).
