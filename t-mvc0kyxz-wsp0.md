---
id: t-mvc0kyxz-wsp0
title: Profile One-owned homepage and docs-navigation main-thread costs
status: done
owner_status:
  state: landed
  text: RAN final five traces per case complete; ranked tables retained; no observed One function above5%, no runtime change or PR per parent stop condition.
  updated_at: 1792219899276
assignees:
- s49235
labels:
- branch:tm/one-runtime-profile
- lane:one-runtime-climb-2
- umbrella:plans/contrast/one-runtime-performance.md
backend: git
created_at: 1792218435047
updated_at: 1792219925208
field_marks:
  active_form: 1792218435047
  body: 1792219925208
  claim: 1792218435047
  evidence_summary: 1792218435047
  owner_status: 1792219899276
  parent: 1792218435047
  priority: 1792218435047
  recovery_ref: 1792218435047
  status: 1792219899276
  title: 1792218435047
---
New assignment from s47560 after negative experiments: current-main production homepage hydration at4x CPU,5 traces; same dev navigation between docs pages; rank self/inclusive by package. Attack single largest One-owned cost only if above about5% total main-thread time. Do not retry rejected candidates. Quiet alternating pairs for any fix, PR from main, parent assigns review, no releases. CI owner ci-manager.

Source snapshot origin/main9ed69cb09, app plus One/vxrn/utils source archived into isolated pro-128 fixture. Their JS targets rebuild before production app build; warm installed dependencies remain read-only links. Production sourcemaps enabled for attribution. Profiler collects5 fresh mobile homepage hydration traces and5 desktop docs introduction-to-routing client traces, all4x CPU, alternating modes. Analysis reports package exclusive/inclusive, per-function rankings and renderer-main active-time denominator; source-map coverage and layout initiators retained. Initial heavy launch refused27% idle; no profiling has run yet.

RAN diagnostic: dev link had React props but root.current.memoizedState.isDehydrated=true and pendingLanes=128; click initiated a Document request. INFERRED initial readiness predicate observed hydrateRoot creation before hydration committed. Updated both cases to await isDehydrated=false, preserving same-document navigation assertion; five traces not complete yet.

RAN five quiet traces per case now pass with zero page/console errors; dev sampled-JS map coverage median99.55%. Production emitted no maps: vxrn client build explicitly overrides sourcemap=false. Generating hidden maps in fixture only and comparing every client JS hash before reusing those captures. Preliminary dev One+router self~1.3%, largest One function linkTo self0.15%; interpretation pending complete attribution.

RAN: final profiling evidence. No speedup candidate or runtime change. Unmapped production generated/module frames remain explicit; mapping coverage is reported below.

Source: current main 9ed69cb09; five traces each; Chrome CPU throttle 4x. Production homepage mobile393x852 at3x density; dev docs introduction to routing1440x1000. No candidate or runtime change.

Times are sampled CPU milliseconds. Percent denominator is the union of all recorded renderer-main event intervals during each CPU profile. Self is exclusive sampled time; inclusive includes all callees and can overlap. Package inclusive counts each sample once per package, not once per function. Browser/native samples are separate. Chrome sample callbacks occasionally arrive out of timestamp order; samples are sorted by reconstructed timestamp before assigning positive elapsed weights.

## production

Renderer-main active: 620.93 (615.00–647.60) ms. Active CPU sampled: 616.41 (608.95–642.77) ms. Mapped JS self coverage: 92.62 (91.78–92.70)%.

| Package | Owner | Self ms median (range) | Self % | Inclusive ms | Inclusive % |
|---|---|---:|---:|---:|---:|
| browser | browser | 367.83 (351.68–393.08) | 59.48 | 367.83 | 59.48 |
| tamagui | tamagui | 99.03 (94.09–104.52) | 15.78 | 105.30 | 16.79 |
| react | react | 73.14 (67.84–78.82) | 11.66 | 179.69 | 28.94 |
| other | other | 23.05 (19.35–24.23) | 3.72 | 82.69 | 12.90 |
| router | one | 20.28 (19.71–25.95) | 3.27 | 29.42 | 4.74 |
| app | app | 16.87 (14.65–18.27) | 2.72 | 20.03 | 3.23 |
| one | one | 12.78 (10.29–14.12) | 2.02 | 31.28 | 5.09 |
| router | react-navigation | 5.44 (3.44–6.75) | 0.89 | 11.23 | 1.82 |

### Top self functions

| Function | Package | Source | Self ms | Self % | Inclusive ms | Inclusive % |
|---|---|---|---:|---:|---:|---:|
| (program) | browser | :0 | 333.35 | 53.91 | 333.35 | 53.91 |
| addThemesFromCSS | tamagui | node_modules/@tamagui/web/dist/esm/helpers/insertStyleRule.mjs:120 | 13.16 | 2.12 | 15.06 | 2.40 |
| renderWithHooks | react | node_modules/react-dom/cjs/react-dom-client.production.js:4627 | 12.51 | 1.93 | 108.23 | 17.39 |
| (anonymous) | app | /config/tamagui.config.ts:18 | 10.17 | 1.59 | 12.42 | 2.01 |
| (garbage collector) | browser | :0 | 7.51 | 1.20 | 7.51 | 1.20 |
| component | tamagui | node_modules/@tamagui/web/dist/esm/createComponent.mjs:163 | 6.51 | 1.05 | 52.54 | 8.11 |
| (anonymous) | other | /assets/SizableText-CaOkpSkT.js:1 | 6.16 | 1.00 | 9.09 | 1.42 |
| commitHookEffectListMount | react | node_modules/react-dom/cjs/react-dom-client.production.js:9011 | 5.04 | 0.82 | 21.30 | 3.37 |
| updateLayout | one | packages/one/dist/esm/views/LoadProgressBar.mjs:55 | 4.55 | 0.74 | 4.68 | 0.75 |
| getSplitStyles | tamagui | node_modules/@tamagui/web/dist/esm/helpers/getSplitStyles.mjs:555 | 4.49 | 0.72 | 31.22 | 5.05 |
| contributeProp | tamagui | node_modules/@tamagui/web/dist/esm/helpers/getSplitStyles.mjs:248 | 3.87 | 0.63 | 20.76 | 3.37 |
| insertStyleRules | tamagui | node_modules/@tamagui/web/dist/esm/helpers/insertStyleRule.mjs:228 | 3.56 | 0.55 | 4.03 | 0.65 |
| proxyThemeToParents | tamagui | node_modules/@tamagui/web/dist/esm/helpers/proxyThemeToParents.mjs:25 | 3.37 | 0.55 | 3.75 | 0.60 |
| commitMutationEffectsOnFiber | react | node_modules/react-dom/cjs/react-dom-client.production.js:10497 | 3.21 | 0.52 | 11.50 | 1.83 |
| InjectedScript | browser | :6597 | 3.09 | 0.50 | 3.29 | 0.53 |

### Top inclusive functions

| Function | Package | Source | Self ms | Self % | Inclusive ms | Inclusive % |
|---|---|---|---:|---:|---:|---:|
| (program) | browser | :0 | 333.35 | 53.91 | 333.35 | 53.91 |
| performWorkUntilDeadline | react | node_modules/scheduler/cjs/scheduler.production.js:121 | 0.22 | 0.04 | 167.41 | 26.96 |
| performWorkOnRootViaSchedulerTask | react | node_modules/react-dom/cjs/react-dom-client.production.js:13555 | 0.00 | 0.00 | 165.72 | 26.69 |
| performWorkOnRoot | react | node_modules/react-dom/cjs/react-dom-client.production.js:12069 | 0.54 | 0.09 | 164.02 | 26.42 |
| performUnitOfWork | react | node_modules/react-dom/cjs/react-dom-client.production.js:12706 | 1.28 | 0.21 | 128.97 | 20.53 |
| beginWork | react | node_modules/react-dom/cjs/react-dom-client.production.js:7768 | 2.98 | 0.49 | 123.19 | 19.67 |
| renderRootConcurrent | react | node_modules/react-dom/cjs/react-dom-client.production.js:12586 | 0.11 | 0.02 | 114.46 | 18.43 |
| workLoopConcurrentByScheduler | react | node_modules/react-dom/cjs/react-dom-client.production.js:12702 | 0.00 | 0.00 | 114.35 | 18.42 |
| renderWithHooks | react | node_modules/react-dom/cjs/react-dom-client.production.js:4627 | 12.51 | 1.93 | 108.23 | 17.39 |
| updateFunctionComponent | react | node_modules/react-dom/cjs/react-dom-client.production.js:6791 | 0.05 | 0.01 | 105.65 | 17.07 |
| updateSimpleMemoComponent | react | node_modules/react-dom/cjs/react-dom-client.production.js:6511 | 0.00 | 0.00 | 58.10 | 9.39 |
| component | tamagui | node_modules/@tamagui/web/dist/esm/createComponent.mjs:163 | 6.51 | 1.05 | 52.54 | 8.11 |
| (anonymous) | other | /assets/_layout-CqTuPffk.js:1 | 2.79 | 0.45 | 50.12 | 7.92 |
| completeRootWhenReady | react | node_modules/react-dom/cjs/react-dom-client.production.js:12240 | 0.31 | 0.05 | 49.70 | 7.96 |
| completeRoot | react | node_modules/react-dom/cjs/react-dom-client.production.js:12867 | 0.00 | 0.00 | 48.99 | 7.81 |

### One-owned self functions

| Function | Package | Source | Self ms | Self % | Inclusive ms | Inclusive % |
|---|---|---|---:|---:|---:|---:|
| updateLayout | one | packages/one/dist/esm/views/LoadProgressBar.mjs:55 | 4.55 | 0.74 | 4.68 | 0.75 |
| onEnd | one | packages/one/dist/esm/safe-area-context/NativeSafeAreaProvider.mjs:18 | 2.61 | 0.42 | 2.61 | 0.42 |
| getDirectoryTree | router | packages/one/dist/esm/router/getRoutes.mjs:22 | 1.46 | 0.24 | 2.53 | 0.41 |
| NavigationContainerInner | router | packages/one/dist/esm/fork/NavigationContainer.mjs:13 | 0.97 | 0.15 | 1.79 | 0.28 |
| QualifiedNavigator | router | packages/one/dist/esm/views/Navigator.mjs:89 | 0.95 | 0.15 | 5.18 | 0.83 |
| replace | router | packages/one/dist/esm/fork/createMemoryHistory.mjs:62 | 0.91 | 0.14 | 0.91 | 0.14 |
| RootLayoutRenderer | router | packages/one/dist/esm/router/useScreens.mjs:74 | 0.77 | 0.12 | 0.86 | 0.14 |
| getPathDataFromState | router | packages/one/dist/esm/fork/getPathFromState.mjs:27 | 0.70 | 0.11 | 1.67 | 0.26 |
| parseQueryParamsExtended | router | packages/one/dist/esm/fork/getStateFromPath-mods.mjs:203 | 0.70 | 0.11 | 0.70 | 0.11 |
| (anonymous) | router | packages/one/dist/esm/fork/getStateFromPath.mjs:89 | 0.61 | 0.09 | 1.57 | 0.25 |
| (anonymous) | one | packages/one/dist/esm/views/PreloadLinks.mjs:98 | 0.58 | 0.09 | 0.58 | 0.09 |
| hasFileExtension | one | packages/one/dist/esm/utils/url.mjs:11 | 0.47 | 0.08 | 0.47 | 0.08 |
| initialize | router | packages/one/dist/esm/router/router.mjs:112 | 0.47 | 0.08 | 11.40 | 1.84 |
| createApp | one | packages/one/dist/esm/createApp.mjs:17 | 0.45 | 0.07 | 0.61 | 0.10 |
| render | one | packages/one/dist/esm/render.mjs:7 | 0.44 | 0.07 | 2.26 | 0.35 |

### One-owned inclusive functions

| Function | Package | Source | Self ms | Self % | Inclusive ms | Inclusive % |
|---|---|---|---:|---:|---:|---:|
| Root | one | packages/one/dist/esm/Root.mjs:33 | 0.08 | 0.01 | 12.94 | 2.08 |
| useInitializeOneRouter | router | packages/one/dist/esm/router/useInitializeOneRouter.mjs:10 | 0.10 | 0.02 | 11.75 | 1.91 |
| initialize | router | packages/one/dist/esm/router/router.mjs:112 | 0.47 | 0.08 | 11.40 | 1.84 |
| setupLinkingAndRouteInfo | router | packages/one/dist/esm/router/router.mjs:171 | 0.00 | 0.00 | 7.22 | 1.16 |
| setupLinking | router | packages/one/dist/esm/router/linkingConfig.mjs:40 | 0.08 | 0.01 | 5.62 | 0.89 |
| QualifiedNavigator | router | packages/one/dist/esm/views/Navigator.mjs:89 | 0.95 | 0.15 | 5.18 | 0.83 |
| (anonymous) | one | packages/one/dist/esm/views/LoadProgressBar.mjs:52 | 0.00 | 0.00 | 5.05 | 0.78 |
| updateLayout | one | packages/one/dist/esm/views/LoadProgressBar.mjs:55 | 4.55 | 0.74 | 4.68 | 0.75 |
| getStateFromPathMemoized | router | packages/one/dist/esm/router/getLinkingConfig.mjs:35 | 0.05 | 0.01 | 4.53 | 0.74 |
| getStateFromPath | router | packages/one/dist/esm/fork/getStateFromPath.mjs:7 | 0.16 | 0.03 | 4.48 | 0.73 |
| (anonymous) | one | packages/one/dist/esm/safe-area-context/NativeSafeAreaProvider.mjs:12 | 0.06 | 0.01 | 3.33 | 0.54 |
| getRoutes | router | packages/one/dist/esm/router/getRoutes.mjs:11 | 0.11 | 0.02 | 2.91 | 0.47 |
| prepareConfigResources | router | packages/one/dist/esm/fork/getStateFromPath.mjs:64 | 0.00 | 0.00 | 2.73 | 0.44 |
| getConfigResources | router | packages/one/dist/esm/fork/getStateFromPath.mjs:56 | 0.00 | 0.00 | 2.73 | 0.44 |
| (anonymous) | one | packages/one/dist/esm/createApp.mjs:160 | 0.00 | 0.00 | 2.72 | 0.44 |

### one functions

| Ranking | Function | Owner | Source | Self ms median (range) | Inclusive ms median (range) |
|---|---|---|---|---:|---:|
| self | updateLayout | one | packages/one/dist/esm/views/LoadProgressBar.mjs:55 | 4.55 (3.36–5.35) | 4.68 (4.20–5.35) |
| self | onEnd | one | packages/one/dist/esm/safe-area-context/NativeSafeAreaProvider.mjs:18 | 2.61 (2.35–3.03) | 2.61 (2.35–3.03) |
| self | (anonymous) | one | packages/one/dist/esm/views/PreloadLinks.mjs:98 | 0.58 (0.11–0.91) | 0.58 (0.11–0.91) |
| self | hasFileExtension | one | packages/one/dist/esm/utils/url.mjs:11 | 0.47 (0.09–0.83) | 0.47 (0.09–0.83) |
| self | createApp | one | packages/one/dist/esm/createApp.mjs:17 | 0.45 (0.00–1.03) | 0.61 (0.00–1.13) |
| inclusive | Root | one | packages/one/dist/esm/Root.mjs:33 | 0.08 (0.00–0.46) | 12.94 (12.47–14.35) |
| inclusive | (anonymous) | one | packages/one/dist/esm/views/LoadProgressBar.mjs:52 | 0.00 (0.00–0.82) | 5.05 (4.21–5.35) |
| inclusive | updateLayout | one | packages/one/dist/esm/views/LoadProgressBar.mjs:55 | 4.55 (3.36–5.35) | 4.68 (4.20–5.35) |
| inclusive | (anonymous) | one | packages/one/dist/esm/safe-area-context/NativeSafeAreaProvider.mjs:12 | 0.06 (0.00–0.83) | 3.33 (3.17–3.78) |
| inclusive | (anonymous) | one | packages/one/dist/esm/createApp.mjs:160 | 0.00 (0.00–0.59) | 2.72 (2.26–3.33) |

### router functions

| Ranking | Function | Owner | Source | Self ms median (range) | Inclusive ms median (range) |
|---|---|---|---|---:|---:|
| self | getDirectoryTree | one | packages/one/dist/esm/router/getRoutes.mjs:22 | 1.46 (0.25–2.00) | 2.53 (2.23–2.82) |
| self | useNavigationBuilder | react-navigation | node_modules/@react-navigation/core/lib/module/useNavigationBuilder.js:168 | 1.21 (0.11–2.33) | 3.83 (3.15–4.15) |
| self | NavigationContainerInner | one | packages/one/dist/esm/fork/NavigationContainer.mjs:13 | 0.97 (0.80–1.08) | 1.79 (1.30–2.67) |
| self | QualifiedNavigator | one | packages/one/dist/esm/views/Navigator.mjs:89 | 0.95 (0.61–2.50) | 5.18 (4.58–5.65) |
| self | replace | one | packages/one/dist/esm/fork/createMemoryHistory.mjs:62 | 0.91 (0.10–0.98) | 0.91 (0.10–0.98) |
| inclusive | useInitializeOneRouter | one | packages/one/dist/esm/router/useInitializeOneRouter.mjs:10 | 0.10 (0.00–0.89) | 11.75 (10.30–12.31) |
| inclusive | initialize | one | packages/one/dist/esm/router/router.mjs:112 | 0.47 (0.02–1.14) | 11.40 (9.50–12.18) |
| inclusive | setupLinkingAndRouteInfo | one | packages/one/dist/esm/router/router.mjs:171 | 0.00 (0.00–0.00) | 7.22 (6.46–7.57) |
| inclusive | setupLinking | one | packages/one/dist/esm/router/linkingConfig.mjs:40 | 0.08 (0.00–0.71) | 5.62 (5.46–5.82) |
| inclusive | QualifiedNavigator | one | packages/one/dist/esm/views/Navigator.mjs:89 | 0.95 (0.61–2.50) | 5.18 (4.58–5.65) |

### react functions

| Ranking | Function | Owner | Source | Self ms median (range) | Inclusive ms median (range) |
|---|---|---|---|---:|---:|
| self | renderWithHooks | react | node_modules/react-dom/cjs/react-dom-client.production.js:4627 | 12.51 (10.28–14.10) | 108.23 (106.39–114.80) |
| self | commitHookEffectListMount | react | node_modules/react-dom/cjs/react-dom-client.production.js:9011 | 5.04 (3.97–6.20) | 21.30 (19.95–22.13) |
| self | commitMutationEffectsOnFiber | react | node_modules/react-dom/cjs/react-dom-client.production.js:10497 | 3.21 (2.37–3.60) | 11.50 (10.07–11.84) |
| self | beginWork | react | node_modules/react-dom/cjs/react-dom-client.production.js:7768 | 2.98 (2.42–5.84) | 123.19 (117.89–128.00) |
| self | useMemo | react | node_modules/react-dom/cjs/react-dom-client.production.js:5809 | 1.94 (0.00–3.23) | 6.06 (3.27–7.67) |
| inclusive | performWorkUntilDeadline | react | node_modules/scheduler/cjs/scheduler.production.js:121 | 0.22 (0.02–0.82) | 167.41 (162.69–169.42) |
| inclusive | performWorkOnRootViaSchedulerTask | react | node_modules/react-dom/cjs/react-dom-client.production.js:13555 | 0.00 (0.00–1.59) | 165.72 (160.54–167.71) |
| inclusive | performWorkOnRoot | react | node_modules/react-dom/cjs/react-dom-client.production.js:12069 | 0.54 (0.02–1.13) | 164.02 (160.25–167.73) |
| inclusive | performUnitOfWork | react | node_modules/react-dom/cjs/react-dom-client.production.js:12706 | 1.28 (0.78–1.65) | 128.97 (125.61–132.70) |
| inclusive | beginWork | react | node_modules/react-dom/cjs/react-dom-client.production.js:7768 | 2.98 (2.42–5.84) | 123.19 (117.89–128.00) |

### tamagui functions

| Ranking | Function | Owner | Source | Self ms median (range) | Inclusive ms median (range) |
|---|---|---|---|---:|---:|
| self | addThemesFromCSS | tamagui | node_modules/@tamagui/web/dist/esm/helpers/insertStyleRule.mjs:120 | 13.16 (12.58–15.89) | 15.06 (13.93–16.81) |
| self | component | tamagui | node_modules/@tamagui/web/dist/esm/createComponent.mjs:163 | 6.51 (3.26–8.55) | 52.54 (48.57–53.98) |
| self | getSplitStyles | tamagui | node_modules/@tamagui/web/dist/esm/helpers/getSplitStyles.mjs:555 | 4.49 (1.73–7.70) | 31.22 (27.53–34.32) |
| self | contributeProp | tamagui | node_modules/@tamagui/web/dist/esm/helpers/getSplitStyles.mjs:248 | 3.87 (1.74–4.72) | 20.76 (17.45–23.99) |
| self | insertStyleRules | tamagui | node_modules/@tamagui/web/dist/esm/helpers/insertStyleRule.mjs:228 | 3.56 (2.15–3.93) | 4.03 (2.45–4.48) |
| inclusive | component | tamagui | node_modules/@tamagui/web/dist/esm/createComponent.mjs:163 | 6.51 (3.26–8.55) | 52.54 (48.57–53.98) |
| inclusive | getSplitStyles | tamagui | node_modules/@tamagui/web/dist/esm/helpers/getSplitStyles.mjs:555 | 4.49 (1.73–7.70) | 31.22 (27.53–34.32) |
| inclusive | createTamagui | tamagui | node_modules/@tamagui/core/dist/esm/runtime.mjs:14 | 0.14 (0.00–0.78) | 30.29 (29.09–31.67) |
| inclusive | createTamagui | tamagui | node_modules/@tamagui/web/dist/esm/createTamagui.mjs:76 | 0.80 (0.15–0.92) | 29.85 (28.96–31.67) |
| inclusive | useSplitStyles | tamagui | node_modules/@tamagui/web/dist/esm/hooks/useSplitStyles.mjs:7 | 0.87 (0.11–1.58) | 25.96 (21.19–27.90) |

### app functions

| Ranking | Function | Owner | Source | Self ms median (range) | Inclusive ms median (range) |
|---|---|---|---|---:|---:|
| self | (anonymous) | app | /config/tamagui.config.ts:18 | 10.17 (6.58–10.30) | 12.42 (11.88–12.99) |
| self | (anonymous) | app | /config/tamagui.config.ts:25 | 1.20 (0.62–4.25) | 1.56 (0.62–4.25) |
| self | (anonymous) | app | /config/tamagui.config.ts:24 | 1.00 (0.26–1.60) | 1.00 (0.60–1.67) |
| self | (anonymous) | app | /config/tamagui.config.ts:17 | 0.65 (0.00–0.90) | 0.90 (0.65–1.07) |
| self | getClipPath | app | /features/site/LayoutDecorativeStripe.tsx:37 | 0.35 (0.00–1.01) | 0.35 (0.00–1.01) |
| inclusive | (anonymous) | app | /config/tamagui.config.ts:18 | 10.17 (6.58–10.30) | 12.42 (11.88–12.99) |
| inclusive | LayoutDecorativeStripe | app | /features/site/LayoutDecorativeStripe.tsx:9 | 0.00 (0.00–0.14) | 1.61 (0.84–2.39) |
| inclusive | (anonymous) | app | /config/tamagui.config.ts:25 | 1.20 (0.62–4.25) | 1.56 (0.62–4.25) |
| inclusive | createMainFont | app | /config/fonts.ts:24 | 0.13 (0.00–1.01) | 1.11 (0.76–1.22) |
| inclusive | (anonymous) | app | /config/tamagui.config.ts:24 | 1.00 (0.26–1.60) | 1.00 (0.60–1.67) |

Browser event duration medians: Layout 80.55ms, UpdateLayoutTree 49.61ms, Paint 11.41ms, PrePaint 10.03ms, V8.GC_SCAVENGER 5.58ms, V8.GC_MARK_COMPACTOR 0.00ms.

## development

Renderer-main active: 1258.91 (1129.61–1301.89) ms. Active CPU sampled: 1226.73 (1098.14–1270.19) ms. Mapped JS self coverage: 99.63 (98.65–99.79)%.

| Package | Owner | Self ms median (range) | Self % | Inclusive ms | Inclusive % |
|---|---|---:|---:|---:|---:|
| react | react | 555.89 (484.60–590.65) | 44.16 | 917.91 | 72.91 |
| browser | browser | 489.24 (454.80–505.35) | 39.06 | 1161.26 | 92.24 |
| tamagui | tamagui | 140.10 (113.58–147.86) | 11.13 | 473.38 | 36.59 |
| other | other | 11.89 (10.63–13.81) | 1.02 | 26.85 | 2.13 |
| router | one | 11.31 (9.67–12.61) | 0.92 | 39.52 | 3.14 |
| app | app | 7.14 (5.60–8.12) | 0.59 | 143.04 | 11.24 |
| router | react-navigation | 6.71 (6.35–9.03) | 0.54 | 17.74 | 1.46 |
| one | one | 3.40 (2.15–3.71) | 0.28 | 9.37 | 0.72 |

### Top self functions

| Function | Package | Source | Self ms | Self % | Inclusive ms | Inclusive % |
|---|---|---|---:|---:|---:|---:|
| (program) | browser | :0 | 264.61 | 21.02 | 264.61 | 21.02 |
| exports.jsx | react | node_modules/react/cjs/react-jsx-runtime.development.js:327 | 126.84 | 9.80 | 140.71 | 10.88 |
| exports.jsxDEV | react | node_modules/react/cjs/react-jsx-dev-runtime.development.js:327 | 108.81 | 8.64 | 131.66 | 10.46 |
| exports.createElement | react | node_modules/react/cjs/react.development.js:1081 | 83.32 | 6.57 | 88.57 | 7.03 |
| run | browser | :0 | 67.81 | 5.39 | 855.55 | 67.73 |
| getPropertyValue | browser | :0 | 65.98 | 5.24 | 65.98 | 5.24 |
| exports.jsxs | react | node_modules/react/cjs/react-jsx-runtime.development.js:345 | 52.35 | 4.16 | 57.67 | 4.58 |
| measure | browser | :0 | 25.01 | 2.07 | 25.01 | 2.07 |
| component | tamagui | node_modules/@tamagui/web/dist/esm/createComponent.mjs:163 | 15.92 | 1.27 | 299.49 | 23.44 |
| contributeProp | tamagui | node_modules/@tamagui/web/dist/esm/helpers/getSplitStyles.mjs:248 | 15.62 | 1.20 | 40.28 | 3.20 |
| getSplitStyles | tamagui | node_modules/@tamagui/web/dist/esm/helpers/getSplitStyles.mjs:555 | 13.02 | 1.00 | 72.34 | 5.75 |
| ReactElement | react | node_modules/react/cjs/react-jsx-dev-runtime.development.js:155 | 9.27 | 0.75 | 9.27 | 0.75 |
| getMDXComponent | other | packages/mdx-rust/src/client.ts:12 | 9.19 | 0.75 | 9.19 | 0.75 |
| react_stack_bottom_frame | react | node_modules/react-dom/cjs/react-dom-client.development.js:28567 | 8.74 | 0.72 | 599.57 | 46.64 |
| now | browser | :0 | 7.93 | 0.61 | 7.93 | 0.61 |

### Top inclusive functions

| Function | Package | Source | Self ms | Self % | Inclusive ms | Inclusive % |
|---|---|---|---:|---:|---:|---:|
| run | browser | :0 | 67.81 | 5.39 | 855.55 | 67.73 |
| runWithFiberInDEV | react | node_modules/react-dom/cjs/react-dom-client.development.js:1040 | 5.21 | 0.43 | 772.92 | 61.40 |
| performWorkOnRoot | react | node_modules/react-dom/cjs/react-dom-client.development.js:17933 | 0.95 | 0.07 | 681.10 | 54.10 |
| performUnitOfWork | react | node_modules/react-dom/cjs/react-dom-client.development.js:19172 | 0.63 | 0.05 | 645.54 | 51.28 |
| performWorkUntilDeadline | react | node_modules/scheduler/cjs/scheduler.development.js:14 | 0.16 | 0.01 | 623.57 | 49.53 |
| beginWork | react | node_modules/react-dom/cjs/react-dom-client.development.js:12052 | 0.39 | 0.03 | 621.04 | 49.26 |
| performWorkOnRootViaSchedulerTask | react | node_modules/react-dom/cjs/react-dom-client.development.js:20642 | 0.09 | 0.01 | 620.94 | 49.32 |
| renderWithHooks | react | node_modules/react-dom/cjs/react-dom-client.development.js:7990 | 0.91 | 0.08 | 600.87 | 46.85 |
| react_stack_bottom_frame | react | node_modules/react-dom/cjs/react-dom-client.development.js:28567 | 8.74 | 0.72 | 599.57 | 46.64 |
| renderRootConcurrent | react | node_modules/react-dom/cjs/react-dom-client.development.js:19006 | 0.00 | 0.00 | 582.77 | 46.29 |
| updateFunctionComponent | react | node_modules/react-dom/cjs/react-dom-client.development.js:10533 | 0.38 | 0.03 | 582.54 | 45.82 |
| workLoopConcurrentByScheduler | react | node_modules/react-dom/cjs/react-dom-client.development.js:19168 | 0.00 | 0.00 | 580.98 | 46.15 |
| updateSimpleMemoComponent | react | node_modules/react-dom/cjs/react-dom-client.development.js:10203 | 0.11 | 0.01 | 326.67 | 25.95 |
| component | tamagui | node_modules/@tamagui/web/dist/esm/createComponent.mjs:163 | 15.92 | 1.27 | 299.49 | 23.44 |
| renderWithHooksAgain | react | node_modules/react-dom/cjs/react-dom-client.development.js:8115 | 0.00 | 0.00 | 264.91 | 21.04 |

### One-owned self functions

| Function | Package | Source | Self ms | Self % | Inclusive ms | Inclusive % |
|---|---|---|---:|---:|---:|---:|
| doPreloadDev | router | packages/one/dist/esm/router/esm/router/router.js:416 | 1.36 | 0.11 | 2.72 | 0.22 |
| linkTo | router | packages/one/dist/esm/router/esm/router/router.js:594 | 1.18 | 0.10 | 9.95 | 0.76 |
| Link2 | router | packages/one/dist/esm/link/Link.mjs:7 | 1.12 | 0.10 | 10.54 | 0.84 |
| onPress | router | packages/one/dist/esm/link/esm/link/useLinkTo.js:16 | 1.01 | 0.08 | 4.90 | 0.40 |
| stripGroupSegmentsFromPath | router | packages/one/dist/esm/router/esm/router/matchers.js:65 | 0.72 | 0.06 | 0.72 | 0.06 |
| dynamicImport | one | packages/one/dist/esm/utils/esm/utils/dynamicImport.js:1 | 0.64 | 0.05 | 0.64 | 0.05 |
| getPathDataFromState | router | packages/one/dist/esm/fork/esm/fork/getPathFromState.js:28 | 0.54 | 0.04 | 1.32 | 0.11 |
| getDynamicParamNames | router | packages/one/dist/esm/fork/esm/fork/useLinking.js:55 | 0.28 | 0.02 | 0.28 | 0.02 |
| getSafeWindowPathname | router | packages/one/dist/esm/router/esm/router/path.js:18 | 0.22 | 0.02 | 0.22 | 0.02 |
| useStoreRouteInfo | router | packages/one/dist/esm/router/esm/router/router.js:400 | 0.14 | 0.01 | 2.73 | 0.24 |
| staticFileExtensionRegex | one | packages/one/dist/esm/utils/esm/utils/url.js:12 | 0.11 | 0.01 | 0.11 | 0.01 |
| hasDescendantWithRoute | one | packages/one/dist/esm/esm/getReactNavigationConfig.js:26 | 0.08 | 0.01 | 0.08 | 0.01 |
| formatToList | router | packages/one/dist/esm/fork/esm/fork/validatePathConfig.js:1 | 0.07 | 0.01 | 0.70 | 0.06 |
| useLinkTo | router | packages/one/dist/esm/link/esm/link/useLinkTo.js:14 | 0.04 | 0.00 | 1.76 | 0.16 |
| previousPathname | one | packages/one/dist/esm/views/esm/views/ScrollBehavior.js:59 | 0.02 | 0.00 | 0.02 | 0.00 |

### One-owned inclusive functions

| Function | Package | Source | Self ms | Self % | Inclusive ms | Inclusive % |
|---|---|---|---:|---:|---:|---:|
| Link2 | router | packages/one/dist/esm/link/Link.mjs:7 | 1.12 | 0.10 | 10.54 | 0.84 |
| linkTo | router | packages/one/dist/esm/router/esm/router/router.js:594 | 1.18 | 0.10 | 9.95 | 0.76 |
| onClick | router | packages/one/dist/esm/link/esm/link/Link.js:58 | 0.00 | 0.00 | 4.97 | 0.40 |
| onPress | router | packages/one/dist/esm/link/esm/link/useLinkTo.js:16 | 1.01 | 0.08 | 4.90 | 0.40 |
| QualifiedNavigator | router | packages/one/dist/esm/views/esm/views/Navigator.js:123 | 0.00 | 0.00 | 4.23 | 0.35 |
| action | router | packages/one/dist/esm/router/esm/router/router.js:769 | 0.00 | 0.00 | 4.14 | 0.35 |
| useStoreRouteInfo | router | packages/one/dist/esm/router/esm/router/router.js:400 | 0.14 | 0.01 | 2.73 | 0.24 |
| useRouteInfo | one | packages/one/dist/esm/esm/hooks.js:15 | 0.00 | 0.00 | 2.73 | 0.24 |
| doPreloadDev | router | packages/one/dist/esm/router/esm/router/router.js:416 | 1.36 | 0.11 | 2.72 | 0.22 |
| usePathname | one | packages/one/dist/esm/esm/hooks.js:37 | 0.00 | 0.00 | 2.39 | 0.21 |
| syncStoreRootState | router | packages/one/dist/esm/router/esm/router/router.js:375 | 0.00 | 0.00 | 2.37 | 0.18 |
| onStateChange | router | packages/one/dist/esm/fork/esm/fork/useLinking.js:360 | 0.00 | 0.00 | 2.22 | 0.19 |
| useLoaderState | one | packages/one/dist/esm/esm/useLoader.js:178 | 0.00 | 0.00 | 1.82 | 0.14 |
| useLoader | one | packages/one/dist/esm/esm/useLoader.js:359 | 0.00 | 0.00 | 1.82 | 0.14 |
| useLinkTo | router | packages/one/dist/esm/link/esm/link/useLinkTo.js:14 | 0.04 | 0.00 | 1.76 | 0.16 |

### one functions

| Ranking | Function | Owner | Source | Self ms median (range) | Inclusive ms median (range) |
|---|---|---|---|---:|---:|
| self | dynamicImport | one | packages/one/dist/esm/utils/esm/utils/dynamicImport.js:1 | 0.64 (0.52–1.28) | 0.64 (0.52–1.28) |
| self | staticFileExtensionRegex | one | packages/one/dist/esm/utils/esm/utils/url.js:12 | 0.11 (0.00–0.15) | 0.11 (0.00–0.15) |
| self | hasDescendantWithRoute | one | packages/one/dist/esm/esm/getReactNavigationConfig.js:26 | 0.08 (0.03–0.79) | 0.08 (0.03–0.79) |
| self | previousPathname | one | packages/one/dist/esm/views/esm/views/ScrollBehavior.js:59 | 0.02 (0.00–0.93) | 0.02 (0.00–0.93) |
| self | getReactNavigationRouteName | one | packages/one/dist/esm/esm/getReactNavigationConfig.js:31 | 0.01 (0.01–0.04) | 0.10 (0.04–0.83) |
| inclusive | useRouteInfo | one | packages/one/dist/esm/esm/hooks.js:15 | 0.00 (0.00–0.00) | 2.73 (0.91–5.63) |
| inclusive | usePathname | one | packages/one/dist/esm/esm/hooks.js:37 | 0.00 (0.00–0.15) | 2.39 (0.95–5.24) |
| inclusive | useLoaderState | one | packages/one/dist/esm/esm/useLoader.js:178 | 0.00 (0.00–0.81) | 1.82 (0.20–2.70) |
| inclusive | useLoader | one | packages/one/dist/esm/esm/useLoader.js:359 | 0.00 (0.00–0.46) | 1.82 (0.67–2.70) |
| inclusive | dynamicImport | one | packages/one/dist/esm/utils/dynamicImport.mjs:1 | 0.00 (0.00–0.97) | 1.28 (0.64–1.59) |

### router functions

| Ranking | Function | Owner | Source | Self ms median (range) | Inclusive ms median (range) |
|---|---|---|---|---:|---:|
| self | doPreloadDev | one | packages/one/dist/esm/router/esm/router/router.js:416 | 1.36 (0.17–1.68) | 2.72 (2.21–3.02) |
| self | linkTo | one | packages/one/dist/esm/router/esm/router/router.js:594 | 1.18 (0.10–1.79) | 9.95 (8.40–10.62) |
| self | onAction | react-navigation | node_modules/@react-navigation/core/lib/module/useOnAction.js:41 | 1.14 (0.67–2.32) | 2.50 (2.20–2.92) |
| self | Link2 | one | packages/one/dist/esm/link/Link.mjs:7 | 1.12 (0.00–3.50) | 10.54 (7.44–15.16) |
| self | onPress | one | packages/one/dist/esm/link/esm/link/useLinkTo.js:16 | 1.01 (0.85–1.72) | 4.90 (4.65–5.54) |
| inclusive | Link2 | one | packages/one/dist/esm/link/Link.mjs:7 | 1.12 (0.00–3.50) | 10.54 (7.44–15.16) |
| inclusive | linkTo | one | packages/one/dist/esm/router/esm/router/router.js:594 | 1.18 (0.10–1.79) | 9.95 (8.40–10.62) |
| inclusive | onClick | one | packages/one/dist/esm/link/esm/link/Link.js:58 | 0.00 (0.00–0.07) | 4.97 (4.65–5.54) |
| inclusive | onPress | one | packages/one/dist/esm/link/esm/link/useLinkTo.js:16 | 1.01 (0.85–1.72) | 4.90 (4.65–5.54) |
| inclusive | acc.<computed> | react-navigation | node_modules/@react-navigation/core/lib/module/createNavigationContainerRef.js:36 | 0.00 (0.00–0.00) | 4.69 (4.26–5.84) |

### react functions

| Ranking | Function | Owner | Source | Self ms median (range) | Inclusive ms median (range) |
|---|---|---|---|---:|---:|
| self | exports.jsx | react | node_modules/react/cjs/react-jsx-runtime.development.js:327 | 126.84 (83.18–135.83) | 140.71 (97.91–150.06) |
| self | exports.jsxDEV | react | node_modules/react/cjs/react-jsx-dev-runtime.development.js:327 | 108.81 (83.22–119.47) | 131.66 (98.80–144.47) |
| self | exports.createElement | react | node_modules/react/cjs/react.development.js:1081 | 83.32 (68.11–90.46) | 88.57 (72.15–97.32) |
| self | exports.jsxs | react | node_modules/react/cjs/react-jsx-runtime.development.js:345 | 52.35 (47.76–59.22) | 57.67 (49.08–63.48) |
| self | ReactElement | react | node_modules/react/cjs/react-jsx-dev-runtime.development.js:155 | 9.27 (4.97–11.93) | 9.27 (4.97–11.93) |
| inclusive | runWithFiberInDEV | react | node_modules/react-dom/cjs/react-dom-client.development.js:1040 | 5.21 (5.07–9.33) | 772.92 (665.68–802.67) |
| inclusive | performWorkOnRoot | react | node_modules/react-dom/cjs/react-dom-client.development.js:17933 | 0.95 (0.64–1.53) | 681.10 (590.43–720.40) |
| inclusive | performUnitOfWork | react | node_modules/react-dom/cjs/react-dom-client.development.js:19172 | 0.63 (0.00–2.66) | 645.54 (553.47–682.51) |
| inclusive | performWorkUntilDeadline | react | node_modules/scheduler/cjs/scheduler.development.js:14 | 0.16 (0.00–1.06) | 623.57 (527.60–655.53) |
| inclusive | beginWork | react | node_modules/react-dom/cjs/react-dom-client.development.js:12052 | 0.39 (0.17–2.97) | 621.04 (527.86–654.43) |

### tamagui functions

| Ranking | Function | Owner | Source | Self ms median (range) | Inclusive ms median (range) |
|---|---|---|---|---:|---:|
| self | component | tamagui | node_modules/@tamagui/web/dist/esm/createComponent.mjs:163 | 15.92 (11.01–21.98) | 299.49 (263.67–316.86) |
| self | contributeProp | tamagui | node_modules/@tamagui/web/dist/esm/helpers/getSplitStyles.mjs:248 | 15.62 (11.23–18.06) | 40.28 (28.82–49.63) |
| self | getSplitStyles | tamagui | node_modules/@tamagui/web/dist/esm/helpers/getSplitStyles.mjs:555 | 13.02 (10.69–14.57) | 72.34 (63.98–77.88) |
| self | readComputedProperties | tamagui | node_modules/@tamagui/animations-css/dist/esm/createAnimations.mjs:74 | 6.60 (1.82–8.52) | 72.70 (63.53–75.24) |
| self | completeResolvedStyles | tamagui | node_modules/@tamagui/web/dist/esm/helpers/getSplitStyles.mjs:1156 | 4.26 (2.44–6.68) | 13.50 (9.15–14.53) |
| inclusive | component | tamagui | node_modules/@tamagui/web/dist/esm/createComponent.mjs:163 | 15.92 (11.01–21.98) | 299.49 (263.67–316.86) |
| inclusive | useSplitStyles | tamagui | node_modules/@tamagui/web/dist/esm/hooks/useSplitStyles.mjs:7 | 3.66 (2.16–4.20) | 76.80 (68.25–82.62) |
| inclusive | (anonymous) | tamagui | node_modules/@tamagui/animations-css/dist/esm/createAnimations.mjs:148 | 0.00 (0.00–0.45) | 73.15 (63.53–75.24) |
| inclusive | readComputedProperties | tamagui | node_modules/@tamagui/animations-css/dist/esm/createAnimations.mjs:74 | 6.60 (1.82–8.52) | 72.70 (63.53–75.24) |
| inclusive | capture | tamagui | node_modules/@tamagui/animations-css/dist/esm/createAnimations.mjs:156 | 0.00 (0.00–0.00) | 72.70 (63.53–75.24) |

### app functions

| Ranking | Function | Owner | Source | Self ms median (range) | Inclusive ms median (range) |
|---|---|---|---|---:|---:|
| self | DocsRouteNavItem | app | /features/docs/DocsRouteNavItem.tsx:27 | 0.98 (0.00–1.44) | 22.78 (20.56–26.72) |
| self | isScrolled | app | /features/site/HeaderMenu.tsx:30 | 0.63 (0.00–1.09) | 4.63 (3.59–5.19) |
| self | RouteTree | app | /features/docs/RouteTree.tsx:27 | 0.33 (0.00–1.62) | 15.38 (4.34–16.48) |
| self | OneBallAnimation | app | /features/brand/Logo.tsx:172 | 0.15 (0.00–0.91) | 0.15 (0.13–0.91) |
| self | (anonymous) | app | /features/docs/MDXComponents.tsx:119 | 0.08 (0.00–0.76) | 0.08 (0.00–1.00) |
| inclusive | DocsRouteNavItem | app | /features/docs/DocsRouteNavItem.tsx:27 | 0.98 (0.00–1.44) | 22.78 (20.56–26.72) |
| inclusive | SubSection | app | /features/docs/DocsMenuContents.tsx:77 | 0.00 (0.00–0.96) | 20.44 (18.93–21.06) |
| inclusive | out | app | /features/docs/MDXComponents.tsx:372 | 0.00 (0.00–1.08) | 18.72 (12.50–21.79) |
| inclusive | RouteTree | app | /features/docs/RouteTree.tsx:27 | 0.33 (0.00–1.62) | 15.38 (4.34–16.48) |
| inclusive | DocCorePage | app | /app/(content)/docs/[slug].tsx:46 | 0.06 (0.00–0.49) | 15.37 (15.01–16.84) |

Browser event duration medians: Layout 23.80ms, UpdateLayoutTree 72.73ms, Paint 4.27ms, PrePaint 4.82ms, V8.GC_SCAVENGER 2.72ms, V8.GC_MARK_COMPACTOR 0.00ms.

RAN cleanup: pro-128 ports4541/4542 have no listeners and tm window status has no grants/pending entries. tm worktree remove reports kept only by own harness PIDs36556/36625/36707/36723/42475 and automatic release on session exit; no external holder, no edits/unpushed commits. Remote fixture/evidence retained for live lane owner s47560; local full report and handoff are outside worktree. No runtime code changed, no CI/review required. Final dev Tamagui component inclusive299.49ms, not an optimization claim.
