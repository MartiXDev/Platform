# Sandcastle `copyToWorktree` on Windows

## Research question

When and how does Sandcastle copy paths supplied through `copyToWorktree`, why does the Windows run fail with `CopyToWorktreeError: ... spawn cp ENOENT`, and how should this repository's `.sandcastle/main.mts` configure dependency setup?

## Executive conclusion

The reported failure is a host-side executable lookup failure in Sandcastle 0.12.0, not a Docker or `npm install` failure. The installed implementation invokes `execFile("cp", ...)` for every existing `copyToWorktree` path. On non-macOS platforms it first passes `-R --reflink=auto`; if that fails, it invokes `cp -R`. On the affected Windows host, Node cannot find a real executable named `cp` on the process `PATH`, so both attempts fail with `spawn cp ENOENT` before any directory contents are copied. The implementation and the published v0.12.0 source agree on this behavior ([installed bundle](../../../../node_modules/@ai-hero/sandcastle/dist/chunk-VOG34SRF.js#L25425-L25468); [first-party source](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/CopyToWorktree.ts)).

The recommended configuration change is to omit `copyToWorktree: ["node_modules"]` and keep dependency installation inside the Docker sandbox. The current `sandbox.onSandboxReady` hook already runs after the sandbox starts, so it can install dependencies without requiring a host copy. This is slower than copying a warm dependency tree, but it avoids host/container native-module mismatches and removes the Windows-only `cp` dependency. Keep `copyToWorktree` for small host files only after verifying that the host has a real compatible `cp` executable, or after moving to a Sandcastle release that uses a cross-platform filesystem API.

## Configuration and applied fix

Before the fix, the relevant project configuration in [`.sandcastle/main.mts`](../../../../.sandcastle/main.mts) was:

```ts
const hooks = {
  sandbox: { onSandboxReady: [{ command: "npm install" }] },
};

const copyToWorktree = ["node_modules"];
```

The planner calls `sandcastle.run()` without `copyToWorktree`. Each issue pipeline later calls `sandcastle.createSandbox()` with both `hooks` and `copyToWorktree`, so the failing copy belongs to the issue sandbox setup rather than the planner. The applied fix removes the `copyToWorktree` option and runs `npm ci` inside the Docker sandbox with a 300-second hook timeout. Sandcastle's installed package metadata identifies the package as `@ai-hero/sandcastle` version `0.12.0` and its first-party repository as `mattpocock/sandcastle` ([installed package metadata](../../../../node_modules/@ai-hero/sandcastle/package.json); [v0.12.0 release](https://github.com/mattpocock/sandcastle/releases/tag/v0.12.0)). The installed source map identifies the bundled copy module as `../src/CopyToWorktree.ts`, which cross-checks the local bundle against the first-party source ([installed source map](../../../../node_modules/@ai-hero/sandcastle/dist/chunk-VOG34SRF.js.map)).

## What `copyToWorktree` means

`copyToWorktree` is an array of paths relative to the host repository root. The public declarations describe it as copying paths into the worktree before sandbox startup, with a host-side timeout whose default is 60,000 ms ([installed declarations](../../../../node_modules/@ai-hero/sandcastle/dist/index.d.ts); [official API documentation](https://github.com/mattpocock/sandcastle/blob/v0.12.0/README.md#all-options)). The v0.12.0 README also says that the option is not supported with `branchStrategy: { type: "head" }`, because that strategy writes directly to the host working directory and does not create a separate worktree ([official branch-strategy documentation](https://github.com/mattpocock/sandcastle/blob/v0.12.0/README.md#how-it-works)).

For the Docker provider used here, the worktree is a host directory that Docker bind-mounts into the container. Sandcastle therefore has a host path to copy into before Docker starts; the container is not the process performing this copy ([official provider documentation](https://github.com/mattpocock/sandcastle/blob/v0.12.0/README.md#custom-sandbox-providers)).

## Exact copy behavior in v0.12.0

The first-party `src/CopyToWorktree.ts` implementation performs the following steps for each configured relative path:

1. Join the host repository root and the relative path to form `src`.
2. If `src` does not exist, skip that path silently.
3. Join the worktree root and the relative path to form `dest`.
4. Run `execFile("cp", [flags, src, dest])`.
5. If that command reports an error, retry with `execFile("cp", ["-R", src, dest])`.
6. If the retry also fails, wrap the retry's stderr or error message in `CopyToWorktreeError`.
7. Apply the configured `copyToWorktreeMs` timeout, defaulting to 60 seconds.

The implementation uses `-cR` on macOS for APFS cloning and `-R --reflink=auto` on other platforms for copy-on-write support. That is an invocation of a program named `cp`; it is not Node's `fsPromises.cp()` API ([first-party source](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/CopyToWorktree.ts); [installed implementation](../../../../node_modules/@ai-hero/sandcastle/dist/chunk-VOG34SRF.js#L25425-L25468)).

This explains why the error names `node_modules` even though the underlying failure is `spawn cp ENOENT`: `node_modules` exists, so Sandcastle proceeds to the executable call. Node reports `ENOENT` while trying to start `cp`, and the second failed attempt's message becomes the wrapped error. A missing source path would instead be skipped by this implementation ([first-party source](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/CopyToWorktree.ts)).

## Why Windows reports `spawn cp ENOENT`

Node's child-process APIs launch an executable by name and use the process environment for command lookup. The default `shell` option is `false`; `execFile()` does not spawn a shell, and `spawn()` emits an `error` when the process cannot be created. Node documents `ENOENT` for a command that does not exist and for a `cwd` that does not exist, and documents that shell behavior is a separate opt-in path ([Node.js `child_process` documentation](https://nodejs.org/api/child_process.html)).

PowerShell's `cp` is an alias for `Copy-Item`, not proof that a file named `cp.exe` is available to a direct Node child-process launch. PowerShell documents `Copy-Item` and its aliases, while Node's `execFile("cp", ...)` bypasses the PowerShell command resolver ([Microsoft `Copy-Item` documentation](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/copy-item); [Node.js `child_process` documentation](https://nodejs.org/api/child_process.html)). A PowerShell prompt can therefore accept `cp`, while the Node process still fails to resolve `cp` on `PATH`.

The Windows `copy` command is also not a drop-in fix for the current Sandcastle implementation. Microsoft documents it as a `cmd.exe` command for copying one or more files and recommends `xcopy` when copying directory trees and subdirectories ([Microsoft `copy` documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/copy)). Sandcastle does not invoke `copy`, `xcopy`, or PowerShell; it invokes `cp` with Unix-style flags.

The observed stack is consequently consistent with this sequence:

```text
host Node process
  -> Sandcastle copyToWorktree()
     -> execFile("cp", ["-R", "--reflink=auto", src, dest])
        -> Windows cannot resolve cp.exe
           -> spawn cp ENOENT
     -> fallback execFile("cp", ["-R", src, dest])
        -> same lookup failure
     -> CopyToWorktreeError
```

Increasing `timeouts.copyToWorktreeMs` cannot repair this error. The timeout controls how long Sandcastle waits for the copy operation; it does not install or resolve the missing executable ([installed declarations](../../../../node_modules/@ai-hero/sandcastle/dist/index.d.ts); [first-party copy source](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/CopyToWorktree.ts)).

## Lifecycle ordering

For a worktree-backed Docker run, the relevant order is:

```text
create git worktree
  -> copyToWorktree on the host
  -> host.onWorktreeReady hooks, sequentially
  -> start Docker sandbox
  -> host.onSandboxReady and sandbox.onSandboxReady, in parallel
  -> expand dynamic prompt commands and run the agent
```

The official README states this ordering explicitly and identifies the execution location and working path for each hook ([official hooks documentation](https://github.com/mattpocock/sandcastle/blob/v0.12.0/README.md#hooks)). The installed bundle shows the same ordering in the `run()` path: copy, then `host.onWorktreeReady`, then sandbox startup ([installed lifecycle calls](../../../../node_modules/@ai-hero/sandcastle/dist/index.js#L1391-L1406)). The `createSandbox()` and `createWorktree()` paths also copy before their later setup steps ([installed `createSandbox` path](../../../../node_modules/@ai-hero/sandcastle/dist/index.js#L1876-L1882); [installed `createWorktree` path](../../../../node_modules/@ai-hero/sandcastle/dist/index.js#L2174-L2183)).

The project's `sandbox.onSandboxReady: [{ command: "npm install" }]` hook is therefore a separate, later operation. It runs inside the started sandbox after the host copy has succeeded. It cannot rescue a failure that occurs before Docker starts. Sandcastle's README also states that dynamic prompt commands run inside the sandbox after the sandbox-ready hooks complete ([official prompt documentation](https://github.com/mattpocock/sandcastle/blob/v0.12.0/README.md#dynamic-context-with-command)).

`host.onWorktreeReady` has the same ordering boundary: it runs after `copyToWorktree`, so it cannot replace a failed built-in copy. `host.onSandboxReady` runs after startup and is parallel with `sandbox.onSandboxReady`; it is not a dependency-install hook inside the container unless the command itself is run through the host shell.

## Recommended configuration

### Preferred: install dependencies in Docker

Remove the `copyToWorktree` option from the `createSandbox()` call and keep the dependency installation hook:

```ts
const hooks = {
  sandbox: {
    onSandboxReady: [{ command: "npm ci", timeoutMs: 300_000 }],
  },
};

const sandbox = await sandcastle.createSandbox({
  branch: issue.branch,
  sandbox: docker(),
  hooks,
});
```

Use `npm ci` instead of `npm install` when this repository intentionally treats `package-lock.json` as authoritative. A bind-mounted Docker worktree lets the sandbox install into the worktree that the agent will use, and the install runs in the container's Linux environment rather than reusing host-native binaries. Sandcastle documents Docker as a bind-mount provider and its sandbox hook as running inside the sandbox ([official provider documentation](https://github.com/mattpocock/sandcastle/blob/v0.12.0/README.md#sandbox-providers); [official hooks documentation](https://github.com/mattpocock/sandcastle/blob/v0.12.0/README.md#hooks)).

This is the best fit for `node_modules`: native packages can contain binaries compiled for the host operating system, while the agent executes inside the container. Copying the host tree first is both unnecessary for correctness when the hook installs dependencies and potentially unsafe for native dependency compatibility.

### If host copying is required

There are three practical choices, in descending order of maintainability:

1. Upgrade to a Sandcastle release whose implementation uses Node's cross-platform filesystem APIs, or submit/upstream that change. Node documents `fsPromises.cp()` for recursive directory copies and `fsPromises.copyFile()` for files ([Node.js filesystem documentation](https://nodejs.org/api/fs.html)). The current v0.12.0 API does not expose a configuration switch for replacing its internal `cp` executable.
2. Run the orchestration process in an environment that provides a real compatible `cp` executable on `PATH`, such as a deliberately configured Git-for-Windows/MSYS or WSL environment. Verify the exact `cp` executable and the `--reflink=auto`/Windows-path behavior in that environment; a PowerShell alias alone is insufficient.
3. Restrict `copyToWorktree` to files that genuinely must be present before startup, and avoid copying `node_modules`. If a host hook is used for a Windows-only file copy, invoke PowerShell explicitly, for example `powershell -NoProfile -NonInteractive -Command "Copy-Item -LiteralPath ... -Destination ..."`, rather than assuming a POSIX `cp` command is portable. Host hooks remain separate from the built-in `copyToWorktree` step.

Do not use `copy`, `xcopy`, or `Copy-Item` as a setting value expecting Sandcastle to substitute its internal command. Those commands only help when the copy is moved into an explicit host script or hook; v0.12.0's built-in option still calls `cp`.

## Decision

For this repository, remove `copyToWorktree: ["node_modules"]` from `.sandcastle/main.mts` and retain sandbox-side dependency installation, with a longer hook timeout for first-time installs. Keep the research note's current workaround separate from any future package upgrade or upstream patch. The existing error is deterministic on a Windows host without `cp.exe`; it is not intermittent Docker behavior and does not justify increasing the copy timeout.

## Sources

- [Sandcastle v0.12.0 repository](https://github.com/mattpocock/sandcastle/tree/v0.12.0)
- [Sandcastle v0.12.0 `CopyToWorktree.ts`](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/CopyToWorktree.ts)
- [Sandcastle v0.12.0 `SandboxLifecycle.ts`](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/SandboxLifecycle.ts)
- [Sandcastle v0.12.0 README: hooks and lifecycle](https://github.com/mattpocock/sandcastle/blob/v0.12.0/README.md#hooks)
- [Node.js `child_process` API](https://nodejs.org/api/child_process.html)
- [Node.js `fs` API](https://nodejs.org/api/fs.html)
- [Microsoft Learn: PowerShell `Copy-Item`](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/copy-item)
- [Microsoft Learn: Windows `copy` command](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/copy)
