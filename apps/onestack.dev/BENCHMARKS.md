# Local One and TanStack Start experiment

The existing website runs on TanStack Start with Tamagui and the same MDX content, public assets, search, themes, redirects and API behavior. This is a standalone Node production experiment. The existing Cloudflare deployment script has not been ported, and this branch must not replace the deployed site yet.

The matching baseline is branch `tm/one-site-baseline`. Both fixtures start from website content commit `9919390233357a1eb174f01634438525ae89614c`. The baseline installs published One 2.7.2, rather than the workspace package family. Start uses 1.169.2 and Router 1.170.44. Both use React/React DOM 19.2.3, Tamagui 3.0.12, Vite 8.3.4, Node 24.3.0 and Chrome 155 on the same Apple M5 host. Production React compilation is enabled for both; the package-pinned compiler versions differ, One 0.145.0 versus Start 0.154.0.

## Running locally

Run these commands from this directory. The leaf npm lockfile makes the comparison independent of workspace package linking.

```sh
npm install --workspaces=false --legacy-peer-deps --no-audit --no-fund
npm run dev
npm run build:web
npm run serve
npm run typecheck
npm run test:dev
npm run test:prod
```

The tests and browser probes require installed Google Chrome. Test setup owns its server on port 8081 and stops it afterwards. Production serve defaults to 127.0.0.1:4312; set PORT to choose another port. MDX server functions read the unchanged content files from this working directory. Valid mailing-list signup still uses the real Supabase service, so supply its existing environment variables to exercise that endpoint. Verification uses an invalid request and does not submit real signups.

The baseline and this site must have installed dependencies before benchmarking. Run timing commands from this directory with the same Node executable:

```sh
tm window run quiet --local --min-idle 60 --timeout 15m --max 10m -- \
  node scripts/benchmark-site.mjs --one /absolute/path/to/baseline/apps/onestack.dev \
  --start "$PWD" --phase dev --runs 3
```

Repeat with `--phase build --runs 5` and `--phase production --runs 3`. The build phase deletes only fixture output directories; run it before production. The development phase temporarily edits and restores the homepage component, shared footer and CSS in both fixtures. Do not run it against another session's live checkout. It owns ports 4411/4412 and its Chrome process, stopping them in cleanup. `node scripts/summarize-benchmarks.mjs` creates reports beside raw JSON in the ignored `evidence/benchmarks` directory.

## Original comparison

RAN: three alternating local development and production pairs, and five alternating builds. Values below are medians. These describe the original published packages, before the separately proposed stack-limit fix in PR 884.

| Development measurement | One | Start |
| --- | ---: | ---: |
| Server ready | 1,236ms | 1,423ms |
| Server tree RSS after home | 818MiB | 571MiB |
| First configuration page visible | 14,575ms | 537ms |
| Home to docs navigation | 315ms | 260ms |
| Homepage component HMR | 310ms | 214ms |
| Shared footer HMR | 799ms | 198ms |
| CSS HMR | 107ms | 62ms |

All HMR samples retained the document and theme. Home was requested before route sampling; later routes are first URL requests after startup and preceding pages. Optimizer and OS caches persisted. Repeat-context results preserve browser and server caches. The cold-document difference is a development observation, not a production page-load comparison.

| Production measurement | One | Start |
| --- | ---: | ---: |
| Server ready | 140ms | 102ms |
| Server tree RSS after home | 120MiB | 87MiB |
| Home browser retained heap | 6.9MiB | 6.3MiB |
| Fresh configuration page visible | 191ms | 200ms |
| Home to docs navigation | 169ms | 263ms |
| Build elapsed | 6.96s | 7.46s |
| Peak build process RSS | 3,503MiB | 1,335MiB |

Production route pages are prerendered, not dynamic SSR throughput tests. Browser requests used identity encoding for both timing fixtures, without bandwidth or CPU throttling. Browser retained heap is measured after network idle and explicit GC. Process-tree RSS may double-count shared resident pages. Build timings exclude shared OG preparation, remove previous output, and retain installed dependencies and OS caches. Small sample ranges are descriptive rather than confidence intervals. Peak build memory and serving memory are different measurements.

RAN: one Lighthouse 13.5.0 audit per production homepage with matching Chrome and mobile simulated-throttling settings. Performance 93/94, accessibility 98/98, best practices 100/100 and SEO 100/100. One/Start FCP was 1.03/1.51s, LCP 3.24/3.01s, TBT 25/56ms and CLS 0.00062 each. This single-run lab observation does not settle a winner or measure field vitals. Both audits flag the missing main landmark and video-poster request priority.

## Validation and limits

TESTED: the original One and Start production outputs emit zero RN/RNW modules or bytes in both client and SSR bundles. The development audit also checks the modules actually requested by representative routes, distinguishing unused optimizer entries from loaded modules. Typecheck and production browser/RSS tests pass. Verification checks same-document navigation, dark-theme persistence, search opening/closing, missing documents, permanent redirects, RSS/llms output and invalid signup responses.

Run `node scripts/verify-site.mjs http://127.0.0.1:4312` against a running production server. It saves WebP captures and a JSON receipt in ignored `evidence`. This probe checks browser exceptions; it does not imply that every console diagnostic is absent. Development has shown a Tamagui client/server theme-config hydration diagnostic that needs further investigation against the original configuration. Three inherited skipped browser tests reference obsolete documentation routes; they were not added or relaxed by the conversion.

The npm leaf install is an isolated comparison fixture. Workspace lockfile integration and Cloudflare deployment remain separate work before production adoption. No dependency was patched to fake platform support, and the original site content and Tamagui remain in use.
