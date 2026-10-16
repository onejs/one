# Studio comparison, third pass

This evidence is independent of the earlier Pro and Studio series. The source control is `0a30e990d77fb812c23148e48a433a1640804036`, including the previously merged unused-vendored-React fix. Candidate source starts at `40c7b29d4b01345eca4c12edb12d1e0ba02f952b`, PR 926; type/test/declaration cleanup is `3e33ef306` with byte-identical executable optimizer artifacts. It removes explicit SSR externals from automatic prebundles and automatic `noExternal` entries. The real Vite optimizer regression failed before the fix and passes afterward for a package root and a subpath-only external, while the similarly named sibling stays optimized. Two further real-optimizer cases replace the prior mock-only exclusion tests, covering string exclusions and mixed string/RegExp exclusions.

The frozen app archives are `origin/tm/one-site-baseline` (`5ae610515`) and `origin/tm/tanstack-site` (`d4b0454f6`). Their installed manifests and locks are preserved in `fixtures/`. Both use the same compiler artifact from `c067377b354833535b866865a60c2fb5fe84182a`, hash recorded in `evidence/setup/provenance.json`; it removes the already diagnosed compiler warning. Both use React 19.2.3, Vite 8.3.4, Tamagui 3.0.12 and oxc-transform-react 0.154.0. Local One packages come from the normal `bun release --into` workflow; declaration generation was initially skipped because of an inherited build issue. Runtime package builds completed; the final narrow vxrn build also generated declarations and passed typecheck.

## Development memory

Three quiet local pairs alternate control/candidate order, each with a fresh Start baseline. Each process starts with fresh optimizer caches, makes six raw SSR requests, checks corresponding hydrated headings, collects garbage via the inspector, then exercises component, shared footer and CSS updates. Updates preserve the document and theme, without browser exceptions. Optimizer metadata is checked to stay inside its own fixture. The changed optimizer artifacts are copied from the normal source builds; their hashes are preserved in `evidence/external-source/`.

| Phase | Control median MiB | Candidate median MiB | Median paired saving MiB |
| --- | ---: | ---: | ---: |
| Ready | 1451.1 | 1236.2 | 210.2 |
| After home | 1881.2 | 1665.3 | 211.1 |
| After six routes | 2116.7 | 1897.7 | 219.1 |
| After six routes and GC | 1801.8 | 1574.4 | 230.7 |
| After live updates | 1935.0 | 1701.7 | -18.4 |

Paired savings and differences of pooled medians are different statistics. All three pairs improve before updates; post-update RSS is mixed, with the candidate higher in two pairs. No lifetime-memory or general speed improvement is claimed. Start's after-collection candidate-arm median is 883.5 MiB, so One remains materially higher. The actual SSR optimizer entry count drops from 264 to 262, removing the explicitly external `@vxrn/mdx-rust` root and client entry.

`summary.json` contains every RSS sample and the paired calculation. Raw phase, heap, process, SSR, update, optimizer and vmmap data are in `evidence/external-confirmation/`. Archived HTML in each arm is the final Start response because the probe reused filenames; per-framework SSR/heading assertions and timings are retained in each `memory.json`. Do not treat those HTML files as both frameworks' responses.

## Production and Lighthouse

Both production builds and all four client/SSR audits emit no native modules. Three alternating production pairs pass six fresh/repeat-context pages and client navigation without document reloads. Home-to-introduction medians are 166.8 ms for One and 346.5 ms for Start, with One faster in all three. This observes current behavior and does not attribute navigation speed to the SSR optimizer change. Earlier rejected navigation experiments remain closed.

One quiet mobile Lighthouse pair uses Lighthouse 13.5.0 and Chrome 155 with identical simulated settings. Performance is 93/90, accessibility 98/98, best practices 100/100, SEO 100/100; LCP is 3240/3003 ms, FCP 947/2703 ms, blocking time 0/3 ms, and CLS zero. There are no warnings or runtime errors. This single pair supports no winner or improvement claim. The identical 29,770-byte video poster is the largest element in both. It appears in initial HTML and is requested at high priority; both audits flag its dimensions relative to display size. No framework defect or kept LCP change was established. Shared public site content is unchanged.

Full Lighthouse JSON, HTML, traces, settings and browser logs are in `evidence/lcp-baseline/lighthouse/`; production browser samples are in `evidence/quiet-production/`. Large HTML, traces and bundle metadata use gzip. Build logs and bundle audits are preserved. Production metadata's site commit refers to the One source being tested, not the independent app archive revisions listed above.

## Excluded diagnostics and reproduction

Earlier `current-memory-baseline` and `node-env-diagnostic` samples are invalid: a probe dependency link exposed optional packages from the source checkout. They are excluded from this branch and all accepted results. The original diagnostic directory is preserved outside the source worktree for audit only. Later diagnostic candidate runs are also excluded from timing claims.

`scripts/` preserves the exact run scripts, including their original absolute fixture and Playwright paths. To reproduce on a new checkout, provision the two frozen app archives, restore their locks, run the normal local package installation and common compiler installation, update those local paths, then run `measure-external.sh` under `tm window run quiet`. There must be no ancestor `node_modules` symlink to the source checkout. `prepare-production.sh` builds each app, and `measure-production.sh` runs browser and Lighthouse checks under the same quiet admission. The compiler artifact is available in the earlier `tm/one-start-round2-studio-final` evidence branch; its exact source and checksum are recorded here. Evidence files are historical measurements, not portable automated tests.
