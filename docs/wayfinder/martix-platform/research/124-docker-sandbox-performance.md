# Docker Sandcastle sandbox performance

Research date: **2026-08-04**. Image tags, package versions, Sandcastle behavior,
and Docker behavior are time-sensitive snapshots. The recommendations below are
performance guidance, not a Supported Capability claim.

## Research question

How should this repository reduce Docker Sandcastle startup and dependency-install
cost while preserving a Linux Node.js environment for `npm ci`, `npx tsx`, GitHub
Copilot CLI, GitHub CLI, and occasional .NET 10 build and test work? In particular,
should the current Node image be replaced by a .NET 10 base image?

## Executive conclusion

**Do not replace the Node image with a .NET 10 image as the default sandbox.** The
current workload is Node-first: the image supplies npm and installs Copilot CLI
with npm, the orchestration entry point is launched with `npx tsx`, and every issue
sandbox runs `npm ci`. A .NET SDK image is designed to build .NET code; it would
still need Node/npm, GitHub Copilot CLI, GitHub CLI, and the same repository
tooling added back. Microsoft distinguishes SDK images for building from runtime
images for running applications ([.NET Docker introduction](https://learn.microsoft.com/en-us/dotnet/core/docker/introduction),
[.NET container image types](https://learn.microsoft.com/en-us/dotnet/core/docker/container-images)).

The smallest low-risk default is a **digest-pinned Debian-based Node slim image**
with the explicitly required `git`, `curl`, `jq`, `gh`, and an exact Copilot CLI
version. Keep glibc/Debian compatibility until the dependency graph proves that
Alpine's musl libc and smaller package set are safe; the official Node image
documentation warns that Alpine uses musl rather than Debian's glibc and does not
include common tools such as Git or Bash ([Node image variants](https://github.com/nodejs/docker-node/blob/main/README.md#image-variants)).

The first performance changes should be:

1. Exclude Sandcastle worktrees, logs, session artifacts, and other files from the
   image build context with `.sandcastle/Dockerfile.dockerignore`.
2. Keep `npm ci`, but mount a writable npm cache at `/home/agent/.npm` and mount
   a **separate per-worktree `node_modules` directory** over the bind-mounted
   repository tree. This directly addresses the recorded `EACCES` failure caused
   by `npm ci` removing a host-owned `node_modules` tree.
3. Add `tsx` as a direct, locked development dependency and execute the local
   binary rather than allowing `npx` to fetch an undeclared package.
4. Pin the base image digest, Copilot CLI version, GitHub CLI package version, and
   the image name used by Sandcastle.
5. Bound issue-sandbox concurrency and pass a measured `cpus` limit to the
   Sandcastle Docker provider.

Use a second, explicitly selected .NET image only for .NET-heavy lanes if the
measured benefit justifies maintaining two images. Do not pay the SDK cost in
every Node-oriented sandbox merely because a few verification tasks sometimes
invoke `dotnet`.

## Repository observations

### Current image and toolchain

The current [`.sandcastle/Dockerfile`](../../../../.sandcastle/Dockerfile) starts
from `node:26-trixie`, installs `git`, `curl`, and `jq`, adds GitHub CLI from its
official apt repository, renames the Node user to `agent`, and installs the
unversioned latest `@github/copilot` globally. The .NET 10 apt installation is
commented out. The image ends as a non-root `agent` user with `sleep infinity` as
its entrypoint.

The [root `package.json`](../../../../package.json) has `@ai-hero/sandcastle`,
TypeScript, and Zod, but no direct `tsx` dependency. Its `sandcastle` script is
`npx tsx .sandcastle/main.mts`. The lockfile is present and uses lockfile version
3 ([`package-lock.json`](../../../../package-lock.json)).

The repository's actual .NET package and compatibility consumer target `net10.0`
([`MartiX.Platform.csproj`](../../../../src/MartiX.Platform/MartiX.Platform.csproj),
[`KernelResultErrorGeneratedSolution.csproj`](../../../../tests/Compatibility/KernelResultErrorGeneratedSolution/KernelResultErrorGeneratedSolution.csproj)).
Building, packing, and running those projects requires an SDK, not only a .NET
runtime.

### Sandbox lifecycle and measured timings

The [Sandcastle entry point](../../../../.sandcastle/main.mts) creates one Docker
sandbox per planned issue, runs the `sandbox.onSandboxReady` hook as `npm ci` with
a 300-second timeout, then runs implementer and reviewer in the same sandbox.
All issue pipelines are passed to `Promise.allSettled()` at once. The planner and
merger also use Docker, but do not use the npm install hook.

The recorded logs show:

- Successful sandbox setup commonly completed in about 1.1 to 4.4 seconds before
  the agent started, including several planner and issue runs ([planner log](../../../../.sandcastle/logs/main-planner.log),
  [issue 8 log](../../../../.sandcastle/logs/sandcastle-issue-8-implementer.log),
  [issue 11 log](../../../../.sandcastle/logs/sandcastle-issue-11-implementer.log)).
- A planner attempt failed with `spawn ENAMETOOLONG` after the full open-issue
  JSON was expanded into the Copilot command line. The current
  [`plan-prompt.md`](../../../../.sandcastle/plan-prompt.md) redirects the issue
  list to `.sandcastle/open-issues.json`, which should remain the required shape;
  passing the entire issue body as an argument must not return.
- On 2026-08-03 at 18:33, `npm ci` exited with code 243 while trying to remove
  `/home/agent/workspace/node_modules/@ai-hero/sandcastle/dist`, reporting
  `EACCES`. This is a reproducible ownership/mount boundary, not evidence that a
  .NET image would be faster ([planner log](../../../../.sandcastle/logs/main-planner.log)).

On 2026-08-04, the retained `.sandcastle` tree contained 7,578 files and about
287.9 MB. The four retained issue worktrees accounted for about 287.4 MB. Their
`node_modules` directories were approximately 47.6 MB, 47.6 MB, 18.5 MB, and
47.6 MB. The current [`.sandcastle/.gitignore`](../../../../.sandcastle/.gitignore)
does not control Docker build context selection, and there is no
`.sandcastle/Dockerfile.dockerignore`.

These measurements make context transfer and worktree dependency ownership the
highest-confidence local optimization targets. No repository log currently
provides enough data to claim that the Node base image itself is the dominant
startup cost.

## Sourced facts

### Docker and BuildKit

Docker treats a local build context as a recursive filesystem tree. A
`.dockerignore` file in the context root removes matching files before the context
is sent to the builder; a Dockerfile-specific ignore file takes precedence
([Docker build contexts and `.dockerignore`](https://docs.docker.com/build/concepts/context/#dockerignore-files)).
The current Sandcastle CLI builds the default Dockerfile with `.sandcastle` as the
context, and its `--dockerfile` form uses the current working directory as the
context ([Sandcastle Docker lifecycle source](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/DockerLifecycle.ts#L28-L52)).

Docker recommends ordering expensive, stable Dockerfile steps before frequently
changing steps, keeping the context small, and using cache mounts for package
manager data. Cache mounts persist across builds without becoming part of the
instruction cache key; BuildKit also supports external `cache-from` and
`cache-to` locations for ephemeral builders ([Docker cache optimization](https://docs.docker.com/build/cache/optimize/),
[Build cache backends](https://docs.docker.com/build/cache/backends/)).

The Dockerfile `RUN --mount=type=cache` facility supports package-manager caches,
including npm and NuGet examples, and cache mounts may use `shared`, `private`, or
`locked` sharing modes ([Dockerfile `RUN --mount`](https://docs.docker.com/reference/dockerfile/#run---mounttypecache)).
Buildx can emit build metadata, import and export external caches, and show raw
build progress suitable for measurement ([`docker buildx build`](https://docs.docker.com/reference/cli/docker/buildx/build/)).

### Bind mounts and Sandcastle

When a bind mount is placed over a non-empty directory, the mounted content
obscures the directory content that was present in the image or lower mount. Bind
mounts are writable by default and changes made by the container can affect the
host ([Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)).

Sandcastle v0.12.0 uses a bind-mounted worktree for Docker, supports additional
host-directory mounts, and passes those mounts to `docker run`. Its provider also
supports an optional `cpus` value, which maps to `docker run --cpus`; it does not
expose a memory option ([Sandcastle Docker provider](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/sandboxes/docker.ts),
[Sandcastle Docker lifecycle](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/DockerLifecycle.ts)).
The provider requires a configured host mount path to exist and resolves a
relative sandbox mount path against the sandbox repository directory ([Sandcastle
Docker provider](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/sandboxes/docker.ts)).

### Node.js and npm

The official Node image includes Node and npm. Its standard Debian image is a
general-purpose base, while `node:slim` contains only the minimal packages needed
to run Node. Alpine images are smaller than Debian slim images, but use musl libc
instead of glibc and omit common tools such as Git and Bash ([official Node image
README](https://github.com/nodejs/docker-node/blob/main/README.md#image-variants)).
The Node project recommends LTS releases for production use and documents the
available Debian and slim variants in the same source ([Node image README](https://github.com/nodejs/docker-node/blob/main/README.md#long-term-support)).

`npm ci` is intended for automated clean installs, requires a lockfile, never
updates the package manifests, and automatically removes an existing
`node_modules` directory before installing ([npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci)).
On POSIX systems npm's default cache is `~/.npm`; `prefer-offline` bypasses cache
staleness checks but still requests missing data, while `offline` fails when data
is missing ([npm config](https://docs.npmjs.com/cli/v11/using-npm/config#cache),
[npm `prefer-offline`](https://docs.npmjs.com/cli/v11/using-npm/config#prefer-offline)).
The npm cache is content-addressed and integrity-checked, but is only a cache and
may be garbage-collected or refetched ([npm cache](https://docs.npmjs.com/cli/v11/commands/npm-cache)).

`npm exec`/`npx` can execute locally installed package binaries, but if a requested
package is not present locally npm may fetch it into the npm cache. npm documents
`npm exec -- <package> ...` and the deprecated `npx --no-install` compatibility
option ([npm exec](https://docs.npmjs.com/cli/v11/commands/npm-exec),
[npx](https://docs.npmjs.com/cli/v11/commands/npx)).

### .NET and the two-image question

Microsoft publishes separate `mcr.microsoft.com/dotnet/sdk`, `aspnet`, `runtime`,
and `runtime-deps` image families. The SDK image is the build toolchain; runtime
images are for running applications ([.NET container images](https://learn.microsoft.com/en-us/dotnet/core/docker/container-images)).
Microsoft also documents that the `dotnet-install` scripts are intended mainly
for non-admin, non-persistent CI installation, and recommends installers for
setting up a development environment ([dotnet-install scripts](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-install-script)).

Therefore, a .NET SDK base is appropriate for a .NET-focused verification image,
but not as a transparent replacement for this repository's Node-focused default.
If a unified image is required, bake an exact SDK into a deliberately versioned
Node-based image or add Node to a deliberately versioned SDK-based image; either
choice is a larger mixed-tool image than keeping separate lanes. This last point
is an engineering inference from the repository's required tool set and the
official image roles, not a vendor size claim.

### CLI installation and image identity

GitHub documents npm installation for Copilot CLI (`npm install -g @github/copilot`)
and supports selecting a version with its install script ([official Copilot CLI
repository](https://github.com/github/copilot-cli#installation)). GitHub CLI's
official Debian instructions use its signed apt repository and publish the
keyring fingerprints that can be checked during installation ([official GitHub
CLI Linux installation](https://github.com/cli/cli/blob/trunk/docs/install_linux.md#debian)).

Docker's `FROM` instruction accepts a tag or a digest, so the reproducible form is
a tested version plus digest rather than an unqualified moving reference
([Dockerfile `FROM`](https://docs.docker.com/reference/dockerfile/#from)).

## Recommended image strategy

### Default: Node slim, not .NET SDK

Use a default image equivalent to:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:26-trixie-slim@sha256:<tested-base-digest>
```

Keep the current Node major only if the compatibility matrix requires it; otherwise
select a tested Node LTS line and pin its patch-level digest. Retain Debian/glibc
for the first candidate. Add only the tools the prompts actually use: Git, curl,
jq, the signed GitHub CLI apt repository, and the exact tested Copilot CLI version.
Use `--no-install-recommends` and one carefully ordered apt layer, then remove
package indexes from the final image. Add Python, make, and a compiler only if a
measured `npm ci` failure proves that a dependency needs native compilation.

Use BuildKit cache mounts for image-build package downloads:

```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm install --global @github/copilot@<tested-version>
```

An apt cache mount can be added with `sharing=locked` if image rebuilds show apt
download time is significant. These mounts improve rebuilds; they do not replace
the runtime npm cache mount because `npm ci` runs after the container starts in a
bind-mounted worktree.

### Optional: a separate .NET verification image

Create a second image name for issues that build, pack, or test `net10.0`, based on
an exact digest of an official `mcr.microsoft.com/dotnet/sdk:10.0` variant. It must
also contain Node/npm, GitHub CLI, and Copilot CLI if it is used by the same
Sandcastle prompts. Select it per issue or per lane through `docker({ imageName })`.

Do not uncomment the existing Debian 12 apt snippet unchanged on the current
`node:26-trixie` base: the repository deliberately combines a Debian 13/trixie
Node variant with a Debian 12 feed in that commented block. Choose a matching
distribution or use the official SDK image. Do not run `dotnet-install.sh` on
every sandbox startup; if it is used for an experimental lane, pin an exact SDK
version, bake it into the image, and measure the resulting image/build cost.

## Cache and bind-mount plan

### 1. Reduce the image build context first

Because the current Dockerfile has no `COPY` or `ADD`, the smallest safe context
for it is effectively the Dockerfile itself. Add a Dockerfile-specific ignore file
at `.sandcastle/Dockerfile.dockerignore` containing an all-exclude rule such as:

```text
**
```

If a later Dockerfile needs a local file, add explicit negated rules for only those
files. Do not use the repository `.gitignore` as a substitute. Clean old Sandcastle
worktrees only when their state is known to be clean; dirty worktrees may contain
unfinished agent work and must be preserved. The expected context-transfer result
for the current Dockerfile is a reduction from the measured roughly 288 MB to a
small Dockerfile/ignore-file context.

### 2. Separate `node_modules` from the source bind mount

Preserve the sandbox-side `npm ci`, but mount a stable, issue-specific host
directory at the relative sandbox path `node_modules`:

```text
.sandcastle/runtime/node_modules/issue-<id>  ->  node_modules
```

Create that host directory before `createSandbox()`. Do not share one
`node_modules` directory across concurrent branches: `npm ci` intentionally removes
and recreates it, and branch-specific dependency trees can differ. The overlay
means npm operates on the dedicated directory rather than deleting files from the
worktree's host bind mount. This follows Docker's documented mount-obscuring
semantics and Sandcastle's documented relative mount-path behavior.

### 3. Share the npm download cache, not the install tree

Add a writable host mount such as:

```text
.sandcastle/cache/npm  ->  /home/agent/.npm
```

Then use the existing hook with the measured, deterministic form:

```text
npm ci --prefer-offline --no-audit --no-fund
```

`prefer-offline` avoids repeated cache freshness checks while still allowing
missing packages to download. Keep `npm ci` rather than switching to `npm install`:
the repository has a lockfile and the clean-install behavior is desirable for a
sandbox. `--no-audit` avoids an unrelated registry audit request during every
sandbox setup; run security auditing in its own explicit gate rather than hiding it
inside the latency-critical hook. Keep lifecycle scripts enabled unless the
dependency policy has separately proven that `--ignore-scripts` is safe.

If concurrent writers to one host npm cache create measurable contention, use one
cache per worker or per issue wave. The npm cache is recoverable, so a cache miss
must remain a correct, if slower, path.

### 4. Make `tsx` a declared local dependency

Add an exact or policy-approved locked `tsx` development dependency and run the
local binary through an npm script or `npm exec -- tsx .sandcastle/main.mts`.
This prevents the orchestration path from depending on an undeclared package being
fetched by `npx`. The same rule applies if an agent invokes `tsx` inside a sandbox.
The host-side orchestrator and the sandbox-side command should be made explicit;
the Node image should not be asked to compensate for a missing repository
dependency declaration.

## Concurrency and resource controls

`Promise.allSettled()` currently starts every planned issue pipeline at once. Add a
bounded worker queue. Start with two concurrent issue sandboxes on Windows Docker
Desktop, then compare one, two, and four workers. Keep the planner and merger
outside that issue-worker budget or give them a reserved slot so a large issue wave
does not starve the control-plane steps.

Pass a measured CPU ceiling through the existing provider option, for example:

```typescript
docker({ imageName: SANDBOX_IMAGE, cpus: 2, mounts: [...] })
```

Do not choose `2` as a universal capacity claim: it is an initial experiment. A
container without constraints can consume the host's available CPU and memory;
Docker documents `--cpus` as a hard CPU ceiling and memory limits as separate
controls ([Docker resource constraints](https://docs.docker.com/engine/containers/resource_constraints/)).
Sandcastle v0.12.0 passes `cpus` but not memory, so memory control must be supplied
through Docker Desktop/daemon policy or a narrowly reviewed Sandcastle provider
extension. Do not add an undocumented command-line workaround to the repository.

Observe for OOM kills, CPU throttling, npm cache contention, and agent latency before
lowering limits. Resource limits that are too low can turn a parallelism problem
into longer wall-clock time.

## Image pinning and refresh policy

Pin all of the following in a versioned image definition or generated evidence:

- Node image patch/version and immutable base digest.
- Copilot CLI package version, installed with `@github/copilot@<version>`.
- GitHub CLI apt package version and the official key fingerprint.
- The Sandcastle image name, image digest, Node/npm versions, and tool versions
  printed by a smoke command.
- `tsx` and all repository dependencies through `package-lock.json`.

Build the image once before a run and pass the same explicit `imageName` to planner,
issue, reviewer, and merger sandboxes. Refresh base and CLI versions in a scheduled
or deliberate change, using `--pull` only during that refresh. Record the resulting
image digest with `docker image inspect` or Buildx metadata; do not silently rebuild
under a stable mutable tag.

## Exact rollout and measurement plan

### Baseline

1. Preserve the current Dockerfile and tag the current image as the baseline.
2. Remove only known-clean stale worktrees, then record the size of `.sandcastle`,
   the four worktrees, and each `node_modules` tree.
3. Run three cold image builds and three warm image builds with
   `docker buildx build --progress=plain --load`, recording context-transfer bytes,
   each layer duration, total build duration, image size, and final image digest.
4. Run the same fixed issue wave at concurrency 1, 2, and 4. Capture timestamps for
   worktree creation, container start, hook start/end, first agent start, implementer
   completion, reviewer completion, and sandbox close.
5. Record `npm` timing output, cache-hit/miss behavior, Docker container CPU/memory
   observations, total wall-clock time, successful commits, and failures including
   `EACCES`, `ENAMETOOLONG`, timeout, and OOM categories. Keep model, prompt,
   repository commit, Docker Desktop version, host CPU/RAM, and network conditions
   constant.

### Candidate sequence

1. Add only `Dockerfile.dockerignore`; repeat the build matrix and confirm the
   context reduction.
2. Switch to the Node slim candidate, pin the digest, pin Copilot and GitHub CLI,
   and add BuildKit npm/apt cache mounts. Run planner plus one representative issue.
3. Add the per-worktree `node_modules` overlay and shared npm cache mount. Repeat
   the representative issue twice, then run two independent issues concurrently.
   The `EACCES` failure must disappear without copying host `node_modules`.
4. Add the direct `tsx` dependency and local execution path. Verify host
   orchestration and any sandbox-side `tsx` invocation with network access disabled
   after installation.
5. Add the bounded worker queue and initial `cpus` value. Compare concurrency 1,
   2, and 4 against the baseline and retain the fastest setting that does not
   increase failure rate or p95 hook/agent latency.
6. Build and test the optional .NET image only against the .NET issue profile. The
   `net10.0` package and compatibility consumers must build, pack, restore, and
   run from that lane; the default Node lane must remain free of the SDK.

### Promotion and rollback criteria

Promote a candidate only when it has the same successful Node, Copilot, GitHub CLI,
and .NET acceptance behavior as the baseline, no permission or mount regressions,
no new timeout/OOM class, a materially smaller build context, and lower or equal
p50/p95 sandbox setup time across the fixed matrix. Keep the baseline image and
image name available until the candidate has completed the full matrix. Roll back
by restoring the baseline image name, hook command, and mount configuration; do not
delete preserved dirty worktrees while diagnosing a failed candidate.

## Decision

Keep a Node-based default sandbox and optimize its context, mounts, dependency
installation, and concurrency. Use `node:26-trixie-slim` or a tested Node LTS
equivalent only after the native-dependency smoke test passes, and pin it by digest.
Do not replace it with a .NET 10 base image. Add a separately selected .NET SDK
image for the repository's `net10.0` build/test lane when the measured frequency of
those tasks warrants a second image. The repository's current evidence points to
context bloat, repeated clean installs, bind-mounted ownership, and unbounded
parallelism as the immediate performance work.

## Sources

- [Docker: optimize cache usage in builds](https://docs.docker.com/build/cache/optimize/)
- [Docker: build contexts and `.dockerignore`](https://docs.docker.com/build/concepts/context/#dockerignore-files)
- [Docker: Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker: `docker buildx build`](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker: bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [Docker: resource constraints](https://docs.docker.com/engine/containers/resource_constraints/)
- [Docker: cache storage backends](https://docs.docker.com/build/cache/backends/)
- [Node.js Docker image README](https://github.com/nodejs/docker-node/blob/main/README.md)
- [Node.js Docker image best practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [npm `ci`](https://docs.npmjs.com/cli/v11/commands/npm-ci)
- [npm configuration: cache and prefer-offline](https://docs.npmjs.com/cli/v11/using-npm/config)
- [npm cache](https://docs.npmjs.com/cli/v11/commands/npm-cache)
- [npm exec](https://docs.npmjs.com/cli/v11/commands/npm-exec)
- [npm npx](https://docs.npmjs.com/cli/v11/commands/npx)
- [Microsoft: introduction to .NET Docker](https://learn.microsoft.com/en-us/dotnet/core/docker/introduction)
- [Microsoft: .NET container images](https://learn.microsoft.com/en-us/dotnet/core/docker/container-images)
- [Microsoft: dotnet-install scripts](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-install-script)
- [GitHub Copilot CLI repository](https://github.com/github/copilot-cli)
- [GitHub CLI: official Linux installation](https://github.com/cli/cli/blob/trunk/docs/install_linux.md)
- [Sandcastle v0.12.0 README](https://github.com/mattpocock/sandcastle/blob/v0.12.0/README.md)
- [Sandcastle v0.12.0 Docker provider](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/sandboxes/docker.ts)
- [Sandcastle v0.12.0 Docker lifecycle](https://github.com/mattpocock/sandcastle/blob/v0.12.0/src/DockerLifecycle.ts)
