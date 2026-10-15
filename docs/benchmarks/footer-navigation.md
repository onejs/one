# Footer HMR and development navigation

Both bounded investigations ended without a retained runtime change. RAN: the published comparison's 1,815ms footer HMR median did not reproduce with PR 884 applied. A navigation candidate reduced its median by 5.1%, but was faster in only two of three pairs and did not establish a consistent gain with the other measured metrics. The candidate and its experimental regression test were removed from framework source. This PR preserves evidence for the closed candidates.

## Footer HMR

RAN three alternating local quiet pairs on studio-64, an Apple M5 Max with 18 cores and 64GiB RAM, using Node 24.3.0 and Chrome 155.0.8059.80. The frozen site sources are `tm/one-site-baseline` at `5ae610515` and `tm/tanstack-site` at `d4b0454f6`. One uses published 2.7.2 plus PR 884's removal of the eager unlimited stack limit; Start uses 1.169.2 and Router 1.170.44. Both use React 19.2.3, Tamagui 3.0.12 and Vite 8.3.4. Their existing React transformers remain 0.145.0 and 0.154.0 respectively.

| Development metric, ms | One plus PR 884 | Start |
| --- | ---: | ---: |
| Footer HMR | 199.3 (196.4–814.4) | 196.6 (196.2–315.6) |
| Homepage HMR | 107.1 (105.6–204.2) | 208.5 (109.5–303.6) |
| CSS HMR | 55.5 (53.1–58.5) | 58.0 (56.9–138.7) |
| Home to introduction | 253.0 (240.2–268.6) | 226.7 (224.6–230.3) |

Numbers are median (minimum–maximum), n=3 per fixture. With three samples, the maximum is also the nearest-rank p95. This is a fresh local observation, not a remeasurement on the original comparison's host. It cannot establish that PR 884 caused the old footer gap to disappear. No new footer fix is kept.

RAN: all 18 HMR samples retained the same document and dark theme with zero reloads. A separate profiled pair observed footer text mutation after 134.9ms for One and 107.9ms for Start. One requested the footer and root layout modules and their extracted CSS; most sampled browser self time was idle or program time. These diagnostic samples include profiling overhead and are excluded from the three-pair table. They do not identify the cause of the historical tail.

## Navigation candidate

RAN: the diagnostic One navigation requested its loader first, then the page at 49.5ms, the content layout at 59.0ms and the docs layout at 66.9ms. Start requested its three destination modules together at 52.2ms. The observed click-to-heading mutation intervals were 174.0ms and 143.9ms. INFERRED: serial layout discovery contributes to One's remaining development navigation cost. If this premise were wrong, starting layouts together would leave the request sequence or navigation latency unchanged.

The candidate used the existing navigation-state route matcher to start only destination layout imports before awaiting the loader. It applied only to web development. Existing loader redirects and page validation still ran in their original sequence. No new API, route prewarming at startup or production mode was introduced. The rejected source and test are preserved in [rejected-candidate.patch](footer-navigation/rejected-candidate.patch).

RAN: built and packed 17 packages from `322e913d2` into an isolated control with normal `bun release --into`, applied the candidate, and built and packed the same package family into a candidate fixture. Both fixtures contain the identical frozen One site and leaf dependencies. Applied PR 884's stack-limit removal equally to both installed `vxrn` source and compiled targets. The artifact audit found differences only in `one`'s router source, compiled targets and generated maps, plus a `create-vxrn` build log. The PR 884 prerequisite remains separate from this evidence-only branch.

TESTED: the experimental nested-layout test failed on original source because neither layout had started when the leaf began loading. With the candidate, both layouts started while pending. Its native case and the existing cold-route, orphaned-navigation and route HMR checks passed: 17 tests across three files. This verifies concurrency and the tested native routing behavior, not a speed gain. The experimental test was discarded with the candidate.

RAN three alternating same-source quiet pairs:

| Pair | Original navigation, ms | Candidate, ms |
| --- | ---: | ---: |
| Original first | 272.5 | 264.4 |
| Candidate first | 274.9 | 258.5 |
| Original first | 253.6 | 258.6 |
| Median | 272.5 | 258.6 |

RAN: the separate source diagnostic confirms the layout requests changed from 65.0/73.3ms to concurrent requests at 47.3ms. The page requested at 56.1ms original and 60.6ms candidate. Click-to-heading mutation measured 169.8ms and 162.0ms. The changed request sequence is demonstrated; a consistent navigation gain is not. No statement attributes the mixed unrelated page timings or HMR tail to the candidate.

The following table retains all source-pair page and HMR timings, including regressions. Startup means spawn to first visible homepage. First URL requests follow home and preceding routes; repeat-context requests reuse that browser context. These are development pages, with SSR result caching on repeat requests, not production prerender measurements.

| Development metric, ms | Original source | Candidate |
| --- | ---: | ---: |
| Startup | 3002.2 (2929.8–6124.1) | 2689.4 (2648.9–6028.9) |
| Fresh home | 137.5 (134.2–149.6) | 141.6 (140.4–149.3) |
| Repeat home | 149.6 (113.8–155.8) | 109.0 (108.2–157.9) |
| First introduction | 388.5 (373.5–405.8) | 427.6 (356.3–527.2) |
| Repeat introduction | 111.7 (109.2–173.0) | 117.6 (114.4–119.1) |
| First routing | 392.9 (372.4–432.6) | 372.8 (368.7–409.7) |
| Repeat routing | 118.7 (113.3–170.9) | 164.9 (164.9–166.2) |
| First configuration | 435.1 (428.5–483.8) | 436.5 (416.2–517.9) |
| Repeat configuration | 202.3 (146.1–203.4) | 143.3 (140.1–203.8) |
| First native | 239.8 (226.9–278.5) | 245.5 (237.4–248.1) |
| Repeat native | 165.4 (163.0–195.5) | 162.2 (109.5–163.3) |
| First blog/version-two | 188.4 (162.3–200.4) | 168.2 (167.7–180.1) |
| Repeat blog/version-two | 152.9 (152.5–162.7) | 153.5 (108.9–165.4) |
| Navigation | 272.5 (253.6–274.9) | 258.6 (258.5–264.4) |
| Homepage HMR | 106.0 (105.8–210.3) | 106.0 (105.9–204.4) |
| Footer HMR | 201.0 (198.0–300.1) | 198.5 (196.8–805.4) |
| CSS HMR | 62.3 (57.6–92.7) | 75.1 (60.6–162.8) |
| Server tree RSS after home, MiB | 973.1 (781.3–1995.5) | 1031.5 (780.9–2031.1) |

Browser retained heap after home was approximately 18.5MiB in both. First startup rebuilt dependency optimizer caches, with high RSS in both first samples; later samples retained those caches. All source HMR samples retained document and theme with no reload. All six-route heading checks and same-document navigation assertions passed. Request-level page-load browser exception assertions passed; the server logs also retain Tamagui global-config and invalid-hook warnings. No general error-free runtime claim is made.

The candidate was rejected before production builds, emitted RN/RNW bundle audits, full search/theme/API/404 interaction checks or a native app build. Those checks are required before retaining a future change. No new pass is claimed for them here. Final framework source and tests match the original branch, with no runtime change to native or production behavior.

## Evidence and reproduction

Raw pairs are [dev-start.json](footer-navigation/dev-start.json) and [dev-source.json](footer-navigation/dev-source.json). Installed package differences are in [source-artifacts.json](footer-navigation/source-artifacts.json); profile summaries and raw profile hashes are in [profiles.json](footer-navigation/profiles.json). The adjacent profile directories contain request and DOM traces. Raw CPU profiles, logs, full package hashes, leaf locks, scripts and installed package artifacts are preserved under `/private/tmp/one-footer-navigation/` on studio-64. Setup failures produced no accepted timing samples.

The benchmark follows `apps/onestack.dev/scripts/benchmark-site.mjs` from `d4b0454f6`. Its 1440×1000 viewport, identity encoding, page order, fresh/repeated contexts, click locator, HMR edits, visibility waits and two paint frames remain unchanged. Servers restart per sample, order alternates, source edits restore in `finally`, and browser/server processes stop after each sequence. The fresh fixture removes One's unresolved workspace TypeScript references; no runtime configuration is changed. The generator replaces the fixture Git metadata lookup with the recorded source commits; these fields describe fixture/source provenance, not an unmodified installed package family.

To recreate the measured controls, extract only `apps/onestack.dev` from each pinned fixture commit into the paths below, install their leaf dependencies from the committed npm locks, remove the isolated One fixture's `tsconfig.references`, and run [prepare.mjs](footer-navigation/prepare.mjs). It applies the prerequisite and derives the benchmark from the original script placed at `/private/tmp/one-footer-navigation/benchmark-site.mjs`.

```sh
tm window run quiet --local -- node /private/tmp/one-footer-navigation/benchmark.mjs \
  --one /private/tmp/one-footer-navigation/one \
  --start /private/tmp/one-footer-navigation/start --runs 3 \
  --output /private/tmp/one-footer-navigation/evidence/baseline
```

For the candidate comparison, use a One source checkout at `322e913d2`. Install normal source packages into `control`, copy that fixture to `candidate`, apply only the `router.ts` hunk from the rejected patch, and run `bun release --into` for `candidate`. Run [prepare-source.mjs](footer-navigation/prepare-source.mjs) to apply the prerequisite equally and generate the two-One descriptors. Then run the same command with `same-source.mjs`, `--one .../control`, `--start .../candidate`, and a distinct output directory. [make-profile.mjs](footer-navigation/make-profile.mjs) derives the separate profiled script; profiled samples must remain separate from the uninstrumented pairs.
