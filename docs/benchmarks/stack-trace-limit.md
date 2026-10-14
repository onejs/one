# Development SSR and the process stack trace limit

TESTED: importing `vxrn/build` changed the process-wide `Error.stackTraceLimit` to infinity. The `vxrn` root export imports that module too, so development SSR inherited the mutation. React 19 development element creation captures errors for owner stacks. Removing the assignment preserves Node's default and any caller-selected limit.

RAN: a request-level CPU profile placed about 80% of sampled self time in React development element-creation functions. The first configuration response took 15,243 ms. Changing only the published control's runtime limit from infinity to 10 reduced it to 383 ms. The source fix installed with `bun release --into` returned it in 220 ms. All three returned 1,744,388 HTML characters. The same-source original retained infinity and took 13,971 ms. These are diagnostic samples, separate from browser measurements.

TESTED: the regression test fails on the original code (`Infinity` instead of the caller's `25`) and passes with the assignment removed. The locally packed root export also preserves `25`. No request cache, prewarming, dependency externalization or React production mode was added.

RAN: three alternating-order development browser runs compared an untouched published One 2.7.2 control with source based on `2363c8236` (local package manifests remain 2.7.0). React 19.2.3, Tamagui 3.0.12, Node 24.3.0, Chrome 155, content and configuration matched. Both fixtures were isolated from the original comparison sites. The table gives median and min–max milliseconds, except memory rows.

| Metric                                |        Published control |             Source fix |
| ------------------------------------- | -----------------------: | ---------------------: |
| Server ready                          |    1049.8 (994.6–1240.6) |   898.5 (869.1–1030.3) |
| Spawn to first visible home           |   3544.4 (3296.6–3996.9) | 2870.8 (2826.3–3624.7) |
| First introduction                    |   1418.7 (1195.2–2052.5) |    404.9 (388.9–550.6) |
| First routing                         |   7384.5 (6270.4–7865.3) |    409.7 (388.3–566.1) |
| First configuration                   | 10854.6 (8645.1–13681.9) |    524.7 (496.5–752.7) |
| First native                          |    1052.4 (894.1–1178.5) |    368.8 (358.0–405.8) |
| First blog/version-two                |      474.5 (308.4–785.2) |    229.1 (224.6–641.1) |
| Home to introduction                  |      270.6 (264.5–316.0) |    264.3 (264.2–314.0) |
| Homepage HMR                          |      208.1 (206.5–303.8) |    126.5 (107.5–811.6) |
| Shared footer HMR                     |      198.9 (198.6–199.3) |    215.7 (201.1–796.7) |
| CSS HMR                               |       110.1 (55.1–141.2) |       61.3 (58.0–63.9) |
| Server tree RSS after home, MiB       |     951.2 (793.2–1027.7) |  1011.0 (830.4–1015.4) |
| Browser retained heap after home, MiB |      18.55 (18.52–18.55) |    18.53 (18.53–18.54) |

RAN: this set includes a 6.3% higher median RSS after home, an 8.5% higher shared-footer HMR median, and worse component/footer HMR tails. Repeat-context configuration and blog medians were 2.2% and 2.8% higher. These observations remain part of the result. No general memory, warm-load or HMR improvement is claimed. The large cold-document latency reduction is the kept improvement.

RAN: a supplementary same-source comparison completed two alternating pairs. Its third pair was interrupted by the six-minute measurement resource window. Subsequent admission refused production work at 0% CPU idle. `top -l 2` confirmed 0% idle, a five-minute load average of 22.26, and nearly full memory. INFERRED: rising host load compromises interpretation of the supplementary timings. They do not settle the RSS or HMR concerns from the published-package comparison.

RAN: after local admission recovered, three complete alternating pairs compared the original source packages with the fix. A file-set and SHA-256 audit of all 17 installed packages found differences only in `vxrn`'s build source, its two compiled targets, and generated maps. The compiled web target differs by the removed assignment. Both package families came from the same source base and normal local release packing. This isolates the source change from differences between published 2.7.2 and the workspace package family.

| Development metric                             |           Original source |             Source fix |
| ---------------------------------------------- | ------------------------: | ---------------------: |
| Server ready                                   |    1509.2 (1359.7–2348.1) | 1525.5 (1402.7–1847.3) |
| Spawn to first visible home                    |    4422.8 (4360.1–5416.9) | 4164.4 (4152.8–4543.5) |
| First home                                     |       283.6 (257.4–304.0) |    271.3 (233.7–301.4) |
| First introduction                             |    1912.0 (1739.5–2200.5) |    597.6 (473.7–693.2) |
| First routing                                  |  10620.5 (9966.2–11121.1) |    722.9 (587.0–723.5) |
| First configuration                            | 16492.8 (11977.1–17524.5) |    714.0 (573.8–764.8) |
| First native                                   |    1734.2 (1463.4–1795.1) |    493.8 (429.5–579.4) |
| First blog/version-two                         |       483.7 (482.9–644.3) |    294.3 (271.4–355.3) |
| Repeat home                                    |       236.2 (150.8–245.8) |    165.9 (154.3–193.7) |
| Repeat introduction                            |       192.7 (178.0–312.7) |    169.7 (167.2–179.1) |
| Repeat routing                                 |       203.4 (166.5–242.6) |    236.8 (203.9–249.6) |
| Repeat configuration                           |      316.3 (295.6–6166.5) |    265.9 (259.4–295.4) |
| Repeat native                                  |       230.9 (183.6–262.1) |    233.1 (193.4–305.2) |
| Repeat blog/version-two                        |       175.6 (152.6–250.8) |    211.8 (162.0–229.4) |
| Home to introduction                           |       395.1 (344.8–437.6) |    320.2 (267.8–323.0) |
| Homepage HMR                                   |       207.5 (205.7–220.9) |    203.0 (106.5–206.3) |
| Shared footer HMR                              |       316.0 (199.0–798.1) |    214.9 (201.9–215.3) |
| CSS HMR                                        |        152.4 (75.7–157.8) |       55.5 (55.2–72.4) |
| Server tree RSS after home, MiB                |       816.2 (783.2–829.4) |    810.2 (801.5–828.3) |
| Server tree RSS after first configuration, MiB |    1136.8 (1029.7–1160.8) |   892.6 (888.3–1000.6) |
| Browser retained heap after home, MiB          |       18.53 (18.52–18.54) |    18.53 (18.52–18.55) |

RAN: the earlier after-home RSS and footer-HMR increases did not repeat in this source comparison. Configuration first-visible latency fell 95.7%. The repeat-routing and repeat-blog medians rose 16.4% and 20.6%, with overlapping ranges. First-routing retained browser heap rose from 28.17 to 29.80 MiB (5.8%); repeat-routing heap remained 28.18 versus 28.17 MiB. These results do not establish general warm-load or browser-memory gains. All 18 HMR samples preserved the document and theme without reloads.

TESTED: six-route headings, metadata, links and code blocks match the published control. Same-document navigation, dark-mode persistence, search, 404 status/page, redirects, RSS/llms APIs and invalid signup responses pass. Browser exceptions and requested RN/RNW modules are zero. All nine HMR samples per fixture retain the document and theme. Both fixtures still report the existing transition warning and the expected missing-page resource diagnostic.

RAN: three alternating production pairs compared the published control with the fix, followed by three pairs using the original source control. These pages are statically prerendered. Fresh browser contexts do not make them dynamic SSR requests. The table retains both comparisons, including slower medians and tails.

| Production metric               |   Published control | Source fix, published comparison |     Original source | Source fix, source comparison |
| ------------------------------- | ------------------: | -------------------------------: | ------------------: | ----------------------------: |
| Server ready                    | 112.8 (110.2–117.9) |              103.8 (101.9–106.0) | 134.0 (111.1–152.1) |           129.5 (108.5–134.6) |
| Spawn to first visible home     | 253.9 (225.1–278.7) |              221.4 (219.9–228.0) | 297.4 (245.1–312.1) |           257.8 (226.3–290.5) |
| Fresh-context home              | 129.3 (118.3–221.1) |              132.4 (126.7–186.4) | 148.9 (125.7–185.2) |           150.8 (129.1–221.1) |
| Fresh-context introduction      | 135.9 (115.3–140.3) |              142.2 (128.7–150.4) | 151.0 (144.2–183.6) |           139.9 (120.2–283.4) |
| Fresh-context routing           | 152.0 (134.6–214.7) |              135.2 (131.0–137.3) | 199.0 (161.9–215.5) |           216.8 (152.3–483.2) |
| Fresh-context configuration     | 161.4 (160.8–215.4) |              157.0 (156.8–179.1) | 244.1 (185.8–318.8) |           284.6 (158.7–289.6) |
| Fresh-context native            | 122.6 (118.0–148.3) |              175.6 (141.5–186.2) | 161.1 (159.6–171.2) |           154.0 (151.0–197.9) |
| Fresh-context blog/version-two  | 131.2 (128.7–142.5) |              136.3 (128.7–143.8) | 237.8 (178.5–288.8) |           198.7 (158.5–220.5) |
| Repeat-context home             |    69.7 (69.0–99.3) |                 67.9 (67.6–97.8) |    84.4 (72.2–88.5) |             80.5 (80.3–122.3) |
| Repeat-context introduction     |    88.4 (78.3–88.8) |                 77.1 (76.5–80.1) |   86.6 (83.5–125.8) |            108.7 (85.1–126.7) |
| Repeat-context routing          |    90.2 (87.2–96.0) |                89.7 (86.1–100.1) | 107.5 (104.2–120.4) |            114.8 (92.1–184.2) |
| Repeat-context configuration    | 118.0 (115.8–120.0) |              120.8 (118.3–125.0) | 156.2 (132.6–156.7) |           130.5 (122.1–157.9) |
| Repeat-context native           |    85.6 (84.4–96.3) |                 85.0 (82.7–85.7) |  101.2 (87.5–112.2) |              88.4 (88.1–89.8) |
| Repeat-context blog/version-two |    84.6 (80.1–85.0) |                 85.7 (82.2–86.2) |  101.7 (93.5–180.6) |            107.6 (85.3–108.2) |
| Home to introduction            | 128.4 (125.5–196.6) |              184.9 (137.8–198.6) | 175.1 (136.0–211.0) |           167.6 (135.4–185.7) |
| Server tree RSS after home, MiB | 122.4 (120.3–124.3) |              120.1 (115.0–124.0) | 119.1 (115.5–121.3) |           117.7 (113.9–120.5) |

RAN: the published comparison's native-page and navigation medians rose 43.2% and 44.0%. Neither increase repeated against the original source packages (4.4% and 4.3% lower). The source comparison still has higher fresh routing/configuration medians (8.9%/16.6%), repeat introduction/routing/blog medians (25.5%/6.8%/5.8%), and some worse tails. Ranges overlap. With three samples per fixture, production results do not prove a general speedup or absence of small regressions. No production improvement is claimed.

RAN: one production build per published/fixed fixture completed in 9462.6/9349.0 ms, with maximum-process RSS 3616.9/3589.3 MiB. This is a validation sample, not a build-speed claim. Both client output directories contain 116,415,585 total JS bytes, 500,530 CSS bytes and 167,795,245 HTML bytes across 1,496 files. These directory totals include per-route outputs and are not a per-page network payload.

TESTED: production repeats all six-route output and interaction/API checks. Both fixtures report only the expected missing-page resource diagnostic, with no browser exceptions. Bundle audits of published, original-source and fixed-source builds each emit zero RN/RNW bytes in client and SSR outputs. Native code and public APIs are unchanged.

RAN: `bun install --frozen-lockfile`, the focused stack-limit regression, and `bun release --into` (17 packages built and installed) passed. Initial CI passed Android Native Build and the stack-limit test, but Checks and Tests failed on the repeated protected-route navigation check waiting for `#public-page`. The unchanged `tests/loader-redirect.test.ts` subsequently passed all 18 tests locally. No test assertions, timeouts or retry settings were changed. Final CI status is tracked on the PR and lane task.

Raw browser samples are in [dev-published.json](stack-trace-limit/dev-published.json). Diagnostic requests and grouped CPU samples are in [requests.json](stack-trace-limit/requests.json) and [profile.json](stack-trace-limit/profile.json). [verification.json](stack-trace-limit/verification.json) preserves checks, console diagnostics and matching route digests. [dev-source-supplemental.json](stack-trace-limit/dev-source-supplemental.json) is explicitly labelled as supplementary.

The complete source comparison is [dev-source.json](stack-trace-limit/dev-source.json), with its package audit in [source-artifacts.json](stack-trace-limit/source-artifacts.json). Production samples are [production-published.json](stack-trace-limit/production-published.json) and [production-source.json](stack-trace-limit/production-source.json). Build samples, runtime checks and emitted-native audits are in [build-published.json](stack-trace-limit/build-published.json), [verification-production.json](stack-trace-limit/verification-production.json) and [bundle-audit.json](stack-trace-limit/bundle-audit.json). Fixture `commit` fields identify the containing repository, not installed package provenance; versions, comparison labels and artifact hashes identify each installed control.

The browser protocol follows the comparison branch's `apps/onestack.dev/scripts/benchmark-site.mjs`, with both descriptors using One, `app/index.tsx` as the entry, and isolated ports 4421/4422. It visits home, introduction, routing, configuration, native and blog/version-two in that order. Each route uses a fresh browser context, then a repeated context. Server processes restart per sample. Existing dependency-optimizer and OS caches remain. A first documentation request is cold for that URL after home and earlier documentation, rather than an empty-cache server. HMR runs afterwards and restores each changed fixture file.

To reproduce the request-level symptom, start an installed One website with `node node_modules/one/run.mjs dev --host 127.0.0.1 --port 4421`, then run this in another shell. Install source into a separate fixture with `bun release --into <fixture>` and repeat after restarting its server.

```js
for (const path of ['/', '/docs/introduction', '/docs/routing', '/docs/configuration']) {
  const start = performance.now()
  const response = await fetch(`http://127.0.0.1:4421${path}`)
  const html = await response.text()
  console.log(path, response.status, performance.now() - start, html.length)
}
```
