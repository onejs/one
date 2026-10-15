# Published One comparison baseline

This isolated leaf fixture pins One and its MDX/color-scheme packages to published 2.7.2. Website content starts at `9919390233357a1eb174f01634438525ae89614c`. React 19.2.3, Tamagui 3.0.12, Vite 8.3.4 and the public assets match the TanStack Start experiment on branch `tm/tanstack-site`.

Install from this directory with `npm install --workspaces=false --legacy-peer-deps --no-audit --no-fund`. Use `npm run dev`, `npm run build:web` and `npm run serve` for local Node serving. Cloudflare deployment is disabled for this timing fixture. The old workspace test setup is not installed in this leaf fixture; baseline behavior was validated by the shared runtime/browser probes instead.

The comparison harness and full method are in the Start branch's `apps/onestack.dev/scripts/benchmark-site.mjs` and `BENCHMARKS.md`. All timing runs are local, with matching Node/Chrome/settings. Temporary HMR edits restore their fixture files. The small shared changes defer mailing-list service loading until a valid request and stabilize the homepage's fixed light theme in both fixtures.

RAN: three alternating development and production pairs, five builds and one mobile Lighthouse audit per framework. Client and SSR bundle audits emit zero RN/RNW modules or bytes. Directory-wide JS totals include per-route outputs and are not a page's transfer size. Development first-route compilation, warm page loads, production prerendered page loads, serving memory and peak build memory are separate observations. The later stack-limit fix in PR 884 is separate from this untouched published-package control.
