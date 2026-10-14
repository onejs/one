# Development SSR and the process stack trace limit

TESTED: importing `vxrn/build` changed the process-wide `Error.stackTraceLimit` to infinity. The `vxrn` root export imports that module too, so development SSR inherited the mutation. React 19 development element creation captures errors for owner stacks. Removing the assignment preserves Node's default and any caller-selected limit.

RAN: a request-level CPU profile placed about 80% of sampled self time in React development element-creation functions. The first configuration response took 15,243 ms. Changing only the published control's runtime limit from infinity to 10 reduced it to 383 ms. The source fix installed with `bun release --into` returned it in 220 ms. All three returned 1,744,388 HTML characters. The same-source original retained infinity and took 13,971 ms. These are diagnostic samples, separate from browser measurements.

TESTED: the regression test fails on the original code (`Infinity` instead of the caller's `25`) and passes with the assignment removed. The locally packed root export also preserves `25`. No request cache, prewarming, dependency externalization or React production mode was added.

RAN: three alternating-order development browser runs compared an untouched published One 2.7.2 control with source based on `2363c8236` (local package manifests remain 2.7.0). React 19.2.3, Tamagui 3.0.12, Node 24.3.0, Chrome 155, content and configuration matched. Both fixtures were isolated from the original comparison sites. The table gives median and min–max milliseconds, except memory rows.

| Metric | Published control | Source fix |
| --- | ---: | ---: |
| Server ready | 1049.8 (994.6–1240.6) | 898.5 (869.1–1030.3) |
| Spawn to first visible home | 3544.4 (3296.6–3996.9) | 2870.8 (2826.3–3624.7) |
| First introduction | 1418.7 (1195.2–2052.5) | 404.9 (388.9–550.6) |
| First routing | 7384.5 (6270.4–7865.3) | 409.7 (388.3–566.1) |
| First configuration | 10854.6 (8645.1–13681.9) | 524.7 (496.5–752.7) |
| First native | 1052.4 (894.1–1178.5) | 368.8 (358.0–405.8) |
| First blog/version-two | 474.5 (308.4–785.2) | 229.1 (224.6–641.1) |
| Home to introduction | 270.6 (264.5–316.0) | 264.3 (264.2–314.0) |
| Homepage HMR | 208.1 (206.5–303.8) | 126.5 (107.5–811.6) |
| Shared footer HMR | 198.9 (198.6–199.3) | 215.7 (201.1–796.7) |
| CSS HMR | 110.1 (55.1–141.2) | 61.3 (58.0–63.9) |
| Server tree RSS after home, MiB | 951.2 (793.2–1027.7) | 1011.0 (830.4–1015.4) |
| Browser retained heap after home, MiB | 18.55 (18.52–18.55) | 18.53 (18.53–18.54) |

RAN: this set includes a 6.3% higher median RSS after home, an 8.5% higher shared-footer HMR median, and worse component/footer HMR tails. Repeat-context configuration and blog medians were 2.2% and 2.8% higher. These observations remain part of the result. No general memory, warm-load or HMR improvement is claimed. The large cold-document latency reduction is the kept improvement.

RAN: a supplementary same-source comparison completed two alternating pairs. Its third pair was interrupted by the six-minute measurement resource window. Subsequent admission refused production work at 0% CPU idle. `top -l 2` confirmed 0% idle, a five-minute load average of 22.26, and nearly full memory. INFERRED: rising host load compromises interpretation of the supplementary timings. They do not settle the RSS or HMR concerns from the published-package comparison.

TESTED: six-route headings, metadata, links and code blocks match the published control. Same-document navigation, dark-mode persistence, search, 404 status/page, redirects, RSS/llms APIs and invalid signup responses pass. Browser exceptions and requested RN/RNW modules are zero. All nine HMR samples per fixture retain the document and theme. Both fixtures still report the existing transition warning and the expected missing-page resource diagnostic.

RAN: `bun install --frozen-lockfile`, the focused stack-limit regression, and `bun release --into` (17 packages built and installed) passed. Production builds, emitted-bundle audits and production timing checks are pending local resource admission. Native code and public APIs are unchanged.

Raw browser samples are in [dev-published.json](stack-trace-limit/dev-published.json). Diagnostic requests and grouped CPU samples are in [requests.json](stack-trace-limit/requests.json) and [profile.json](stack-trace-limit/profile.json). [verification.json](stack-trace-limit/verification.json) preserves checks, console diagnostics and matching route digests. [dev-source-supplemental.json](stack-trace-limit/dev-source-supplemental.json) is explicitly labelled as supplementary.

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
