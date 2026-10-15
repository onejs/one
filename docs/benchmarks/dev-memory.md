# Development memory: rejected SSR source-map candidate

RAN: three alternating local pairs found no safe memory improvement from selecting Vite's `prepareStackTrace` source-map interceptor for One's web SSR module runner. The candidate was discarded. This branch preserves the experiment and contains no framework source change, release or deployment.

The published comparison motivating this slice reported after-home tree RSS medians of 790.5 MiB for One 2.7.2 and 567.2 MiB for Start, with Start spanning 515.9 to 999.2 MiB. Those measurements used a different protocol. This experiment compares identical One source packages and makes no fresh Start comparison.

## Matched measurements

RAN: both fixtures came from source `0330d6eb1` and received all 17 local packages through normal `bun release --into`. The package versions remain 2.7.0. React and React DOM were 19.2.3, Tamagui 3.0.12, Vite 8.3.4 and One's React transformer 0.145.0. Node was 24.3.0 and Chrome was 155.0.8059.79 on a local Apple M5 with 10 cores and 32 GiB RAM. Source hashes match for all 587 fixture files, including an added diagnostic API shared by both fixtures. Package file hashes isolate the change to `fileSystemRouterPlugin` source, compiled targets and maps, plus a `create-vxrn` build log. See [fixture-source.json](dev-memory/fixture-source.json) and [source-artifacts.json](dev-memory/source-artifacts.json).

RAN: a quiet local window admitted the complete warmup and comparison command. One full sequence warmed each fixture, then three pairs ran control/candidate, candidate/control, control/candidate. Every run used a fresh server process and browser context. Disk, optimizer and OS caches persisted. The browser reused its context across home, repeat home, introduction, configuration and repeat configuration. Memory was sampled three seconds after readiness and two seconds after each page settled and browser garbage collection completed. Server garbage collection ran only after the final configuration sample. The harness records actual elapsed times and per-process rows. See [measure.json](dev-memory/measure.json), [summary.json](dev-memory/summary.json) and the separately excluded [warmup.json](dev-memory/warmup.json).

Each cell is the median followed by minimum to maximum, with three samples per variant. MiB means 2²⁰ bytes. Process RSS comes from `process.memoryUsage()`. Tree RSS comes from `ps`. Every final sample contained one process, with the two RSS readings differing by at most 48 KiB because they were collected sequentially. Neither measurement is a physical private-memory total.

| Metric | Control | Rejected candidate |
| --- | ---: | ---: |
| Ready process RSS, MiB | 371.5 (370.4 to 374.5) | 371.9 (368.2 to 373.2) |
| First home process RSS, MiB | 918.9 (813.5 to 929.1) | 949.7 (855.9 to 1059.0) |
| Repeat home process RSS, MiB | 922.3 (816.8 to 932.3) | 952.7 (860.5 to 1062.6) |
| Introduction process RSS, MiB | 963.7 (801.1 to 970.1) | 1016.4 (903.7 to 1021.8) |
| First configuration process RSS, MiB | 1088.9 (1001.6 to 1098.3) | 1082.6 (1076.5 to 1109.5) |
| Collected server RSS after docs, MiB | 692.0 (600.9 to 698.7) | 682.2 (672.6 to 709.2) |
| Collected server heap after docs, MiB | 244.4 (207.2 to 244.9) | 249.7 (249.2 to 252.0) |
| Retained browser heap, first home, MiB | 18.53 (18.53 to 18.53) | 18.53 (18.53 to 18.53) |
| Retained browser heap, first configuration, MiB | 42.08 (42.07 to 42.09) | 42.09 (42.06 to 42.11) |
| Server readiness, ms | 1168.9 (1012.2 to 1331.5) | 1034.6 (1025.7 to 1148.3) |
| First home visible, ms | 1623.3 (1599.8 to 1945.3) | 1601.3 (1590.0 to 1930.3) |
| Repeat home visible, ms | 154.3 (152.4 to 157.3) | 157.0 (152.8 to 173.3) |
| First introduction visible, ms | 1098.4 (1081.6 to 1116.7) | 1137.0 (1082.9 to 1401.4) |
| First configuration visible, ms | 16590.7 (16479.2 to 17441.7) | 17385.4 (16820.6 to 19794.4) |
| Repeat configuration visible, ms | 150.3 (134.9 to 151.3) | 139.4 (135.4 to 142.5) |

RAN: candidate after-home RSS was 3.3% higher at the median. Final collected heap was 2.2% higher and increased in every pair. First configuration visibility was 4.8% slower at the median and slower in every pair. Collected RSS had a slightly lower median with overlapping ranges, a higher maximum and two worse pairs. The results do not support a memory improvement or a general speed improvement. Small browser heap differences do not support a browser-memory claim.

## Profile and source premise

RAN: before editing framework source, an allocation-sampled run covered startup, home, introduction and configuration. Collected server heap was 65.8 MiB at readiness, 278.0 MiB after home and 297.1 MiB after docs. Its RSS reached 2156.2 MiB before collection on configuration. Allocation sampling and collection at every stage changed this run's memory behavior, so its RSS is excluded from the matched comparison. The source fixture's ordinary after-home RSS in the final control runs was 813.5 to 929.1 MiB, reproducing substantial development residency without claiming an exact reproduction of the original protocol.

RAN: the profile's large retained allocation frames included Vite `fetchModule` (50.4 MiB), Node's generated-source-map regexp path (48.3 MiB), Vite `runInlinedModule` (25.6 MiB), Node `sourceMapFromDataUrl` (19.3 MiB) and Node source-map parsing (14.7 MiB). These are sampling estimates of JavaScript allocations. They do not account for all native allocations. Stage observations and frame summaries are in [profile.json](dev-memory/profile.json). The complete raw allocation profile and server logs are preserved outside the checkout under `/private/tmp/one-start-dev-memory/` and in the final archive.

INFERRED: duplicate retention around generated SSR code and source maps was a plausible source target. Vite's default server module runner enables Node source maps, while its supported `prepareStackTrace` interceptor can retrieve maps from its evaluated-module graph. The small candidate selected that interceptor only for One's Node web SSR runner. The rejected patch is in [rejected-candidate.patch](dev-memory/rejected-candidate.patch).

RAN: `process.sourceMapsEnabled` was true in both variants at readiness and every later stage. Selecting the mapper for this runner did not disable global Node source-map collection in this fixture. Reading the installed Tamagui loader also found its separate `environment.runner` evaluation path. INFERRED: another runner can retain the global source-map behavior, making this one-runner switch insufficient. The enabling call was not traced, so no particular runner is established as the cause. A trace showing that this runner alone enables the flag would contradict that inference. The measured lack of a retained-heap reduction rejects the candidate regardless.

## Validation and limits

RAN: all eight warmup/final server sequences completed. Both variants served the expected home, Introduction and Configuration headings without browser exceptions. Each sequence returned an error stack mapped to line 4 of the diagnostic TypeScript API, including the candidate's Vite mapper. Final requests contained no direct RN/RNW paths under the explicit request audit. The audit distinguishes the site's SVG alias from RN/RNW. See [request-audit.json](dev-memory/request-audit.json).

RAN: `Error.stackTraceLimit` remained Infinity in both fixtures throughout. PR 884 was neither edited nor installed into these fixtures. Its removal of the eager stack assignment remains independent. These batches must not be combined with PR 884's timings to claim a matched winner. The rejected Vite import from PR 887 was not repeated.

The candidate was rejected before HMR, theme, navigation, search, 404, production emission and native validation. Those candidate behaviors are unverified. The final branch restores the framework source exactly, so it keeps no runtime or API change. This slice makes no emitted-bundle, native, HMR or production performance claim. No helper or reviewer was used.

## Reproduction and future work

Create two isolated copies of the published comparison site, with its package references resolving to this checkout and identical dependencies. Copy [memory-source-map+api.ts.fixture](dev-memory/memory-source-map+api.ts.fixture) to `app/memory-source-map+api.ts` in each. At source `0330d6eb1`, install the locked workspace dependencies and run normal `bun release --into <control>`. Apply the rejected patch and run normal release into the candidate. The fixture/package hashes above record the tested artifacts. Run the warmup separately, then the three-pair comparison:

```sh
tm window run quiet --local --min-idle 80 --timeout 40m --max 10m -- \
  node docs/benchmarks/dev-memory/measure.mjs <control> <candidate> <output>/warmup warmup
tm window run quiet --local --min-idle 80 --timeout 40m --max 10m -- \
  node docs/benchmarks/dev-memory/measure.mjs <control> <candidate> <output>/final comparison
```

The saved command ran both sequences in one admitted window. The retained script uses normal Playwright package resolution, with the same Playwright implementation as the executed probe. It starts Node under the inspector to read server heap and process memory, and uses Chrome heap collection for browser retained memory. There is no allocation sampling in the final pairs. The inspector itself is a matched measurement limitation. Raw server logs, requests, mapped stacks, setup failures, fixture sources, package artifacts and helpers are archived before removing the owned worktree.

Future work can trace every source-map enabler and quantify code/map copies across the SSR and Tamagui runners. It should first establish a fresh control after PR 884 is accepted, keeping that separate from these batches. A shared map-storage improvement would need mapped-error and HMR validation before keeping it. No further candidate was attempted in this bounded slice.
