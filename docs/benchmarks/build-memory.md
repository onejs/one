# Production build memory: rejected Vite import candidate

RAN: this bounded experiment found no reproducible build-memory reduction. The candidate was discarded. This branch changes documentation and evidence only; it contains no framework fix, release, or deployment.

The candidate removed `buildPage`'s Vite import, used only for `normalizePath`, and replaced it with `node:path` normalization. Worker count, concurrency, compiler, content, build flags, package family and output settings stayed fixed. The rejected patch is retained in [rejected-candidate.patch](build-memory/rejected-candidate.patch).

## Final measurements

RAN: three local alternating pairs ran in a `tm window run quiet --local --min-idle 80` window on an Apple M5 with 10 cores and 32 GiB RAM. Each command was `/usr/bin/time -l node node_modules/one/run.mjs build`, with `NO_COLOR=1` and `ONE_SERVER_URL=https://onestack.dev`. Only `dist` was removed before each run. Dependency optimizer/compiler caches and OS caches persisted. No profiling hooks ran in these final measurements. Both fixtures had already completed builds and normal local package installation.

The table gives median and minimum–maximum. RSS is MiB (2²⁰ bytes). Maximum-process RSS comes from macOS `time`; process-tree RSS sums the build and its descendants every 250 ms, so it can miss short peaks. Worker threads share the build process RSS and must not be added as separate processes.

| Metric | Original source | Rejected candidate |
| --- | ---: | ---: |
| Build elapsed, ms | 11,034.9 (8,164.8–11,696.1) | 9,163.8 (9,022.5–9,948.9) |
| Maximum-process RSS, MiB | 3,481.3 (3,456.5–3,507.2) | 3,508.4 (3,432.8–3,559.1) |
| Sampled peak-tree RSS, MiB | 3,456.2 (3,450.4–3,475.8) | 3,480.4 (3,422.6–3,540.6) |

RAN: candidate median maximum-process RSS was 0.8% higher and median sampled tree RSS was 0.7% higher. Its maximum RSS and tree-RSS tails were also worse. The median elapsed time was 17.0% lower, but ranges overlapped and the last candidate run was 10.5% slower than its paired original. This does not satisfy the memory acceptance criterion. No speed improvement is retained or claimed. Raw samples and order are in [build.json](build-memory/build.json), with [summary.json](build-memory/summary.json).

RAN: an earlier, non-quiet diagnostic pair also showed no RSS reduction: 3,501.6 versus 3,507.0 MiB. Elapsed time was 13,691.9 versus 9,857.5 ms. These timings are diagnostic only. Both client output directories had 116,415,585 JS bytes, 500,530 CSS bytes and 167,795,245 HTML bytes across 1,496 files. These are directory totals including per-route outputs, not page transfer sizes. Compression totals differed because generated cache keys varied, so byte-identical output is not claimed. See [diagnostic.json](build-memory/diagnostic.json).

## Profiling and candidate selection

RAN: a completed original-source profile sampled process RSS at 100 ms intervals in the main thread and each worker. RSS was 1,017.6 MiB before prerendering, peaked at 3,532.9 MiB while eight workers built static pages, and fell to 2,565.8 MiB when the pool terminated. The complete build took 12.97 seconds and rendered 195 pages. Worker isolate peak heaps ranged from 121.3 to 188.0 MiB; their external allocations also grew. Per-isolate RSS fields refer to the same shared process and are not additive.

RAN: a second complete profile used inspector allocation sampling at 64 KiB intervals. Its retained allocation stacks included Vite and Rolldown modules in the worker isolates. Reading the worker call path found that `buildPage` directly imported Vite for a single path normalization. This motivated the small import candidate. Sampling profiles are summaries of retained JavaScript allocations, not a complete accounting of native memory or all transient allocations. Stage samples, isolate peaks and the largest retained allocation frames are in [profile.json](build-memory/profile.json).

INFERRED: prerendering is the main surface contributing to this fixture's observed peak. The completed stage profile supports that inference; a peak before worker startup would contradict it. The final paired builds do **not** support the narrower hypothesis that removing this direct Vite import materially lowers the full-build peak. No alternative cause or broad refactor was attempted in this slice.

RAN: a CPU-profiled attempt stalled after bundling and before static generation, spending almost all subsequent samples idle until its 20-minute diagnostic deadline. That incomplete run and two earlier fixture-path failures are excluded. Later memory-only and inspector-allocation builds completed. The evidence does not establish why the CPU-profiled attempt stalled.

## Provenance and limits

RAN: original and candidate packages came from source `2363c82361d8e0098ceacbabf64ab9ae827e615e`, using `bun install --frozen-lockfile` followed by normal `bun release --into <fixture>` for each. Their package manifests remain 2.7.0. This isolates the candidate from published One 2.7.2 differences. A file-set and SHA-256 audit of all 17 installed local packages found changes only in `one`'s buildPage source, compiled targets and maps, plus the packed `create-vxrn/.turbo/turbo-build.log`. The latter is build bookkeeping, not executed code. See [source-artifacts.json](build-memory/source-artifacts.json).

RAN: fixture source hashes match, including content, configuration, package manifest and public assets. The fixtures were copied from the published-package comparison site into this worker's isolated directory; the parent's sites were never edited. Symlinks restored the site's unchanged relative tsconfig references to this checkout's packages and base tsconfig. Node was 24.3.0, React/React DOM 19.2.3, Tamagui 3.0.12 and Vite 8.3.4. Frozen file hashes are in [fixture-source.json](build-memory/fixture-source.json).

The separate original comparison used One 2.7.2 versus Start 1.169.2, with respective compiler versions 0.145.0 and 0.154.0. Both had compiler-enabled production. This experiment uses One's 0.145.0 in both fixtures and makes no fresh Start comparison. The earlier reported One/Start build medians (6,963.8/7,460.6 ms) were collected at a different time and cannot be combined with these elapsed times to claim current competitive speed.

RAN: every completed diagnostic/final build reported zero emitted RN/RNW modules and bytes for client and SSR audits; the extracted checks are in [bundle-audit.json](build-memory/bundle-audit.json). Since the candidate failed the memory criterion and was discarded, candidate browser interactions, production page timings and native checks were not run. No behavior-pass or production-speed claim is made for it. Framework, native and public API source on this branch remains unchanged. PR 884 was neither edited nor merged; the rejected candidate touched a different file from its stack-limit fix.

## Reproduction

Use two isolated copies of the comparison site with identical installed dependencies and the unchanged relative tsconfig references available. Install the pinned source package family into the first using `bun release --into <original>`. Apply [rejected-candidate.patch](build-memory/rejected-candidate.patch) to that source and run the same normal release into the second. The fixture manifest and frozen content are recorded above; the archived complete helper set preserves the comparison harness.

Run the retained build-only harness, supplying original and candidate directories and an output directory:

```sh
tm window run quiet --local --min-idle 80 --timeout 15m --max 10m -- \
  node docs/benchmarks/build-memory/benchmark.mjs <original> <candidate> <output>
```

The harness removes only output directories, alternates original/candidate then candidate/original then original/candidate, measures complete build commands, samples process-tree RSS, and saves all six raw samples and logs. It performs no compression or package installation inside or outside the build clock. The original comparison harness also calculated compressed output totals after its clocks stopped; that unmeasured postprocessing was omitted from the final run. Profiling instrumentation was used only in separate diagnostic builds.
