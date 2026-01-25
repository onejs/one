# Hydration Fix Investigation

## The Bug
On addeven.com, the home page component remounts during hydration:
- First render: `home «Rd6qlj»` (SSR ID with uppercase R)
- Second render: `home «r0»` (Client ID with lowercase r)

When useId changes from `«R...»` to `«r...»`, it means React abandoned hydration and created a fresh component tree from scratch.

## Timeline
- Layout renders: `what is «Rj»` (SSR, correct)
- Home first render: `home «Rd6qlj»` (SSR, correct)
- Home second render: `home «r0»` (Client, WRONG - remounted!)

## What's Been Ruled Out

### 1. Encoding/Charset Issue
- Added `<meta charSet="utf-8"/>` as first head element - already present in addeven
- The encoding fix is unrelated to this hydration abandonment bug
- Encoding causes DOM/React mismatch but NOT component remounting

### 2. Local Build Differs from Production
- Local addeven (localhost:3006) shows: `home «Rpmlj»` twice (same ID, no remount)
- Production (addeven.com) shows: `home «Rd6qlj»` then `home «r0»` (remount!)
- Same One version (1.2.82), same vite.config
- Difference is in Vercel deployment vs local serve

### 3. SPA Mode Check
- Verified `__vxrnIsSPA` is NOT set in deployed HTML
- Bundle correctly uses `hydrateRoot` not `createRoot`

## What Needs Investigation

### Hypothesis 1: Vercel Edge/CDN Issue
- Local serves from `one serve` directly
- Production goes through Vercel CDN
- Could Vercel be modifying the HTML in a way that causes hydration mismatch?

### Hypothesis 2: Script Loading Timing
- `experimental_scriptLoading: 'after-lcp-aggressive'` delays scripts
- Maybe too much delay causes something to change?

### Hypothesis 3: React Compiler Interaction
- `react: { compiler: true }` is enabled
- Could React Compiler + delayed script loading cause issues?

### Hypothesis 4: CSS Inlining
- `inlineLayoutCSS: true` is enabled
- Different CSS in prod vs local build?

## Key Config (addeven vite.config.ts)
```ts
one({
  react: { compiler: true },
  web: {
    experimental_scriptLoading: 'after-lcp-aggressive',
    inlineLayoutCSS: true,
    defaultRenderMode: 'ssg',
    deploy: 'vercel',
  },
})
```

## KEY FINDING: Bug happens in real Chrome but NOT in Playwright

### Evidence
- **Real Chrome**:
  - Console: `home «Rd6qlj»` → `home «r0»` → `home «r0»`
  - DOM: `data-use-id="«r0»"` (client ID)

- **Playwright (headless or headed)**:
  - Console: `home «Rd6qlj»` → `home «Rd6qlj»` (only 2 logs!)
  - DOM: `data-use-id="«Rd6qlj»"` (SSR ID preserved)

### Why Playwright doesn't repro
Playwright behaves differently - possibly:
1. Font loading works differently (shows "loaded" immediately)
2. Script execution timing differs
3. Some browser feature that triggers the remount is disabled

### The bug DOES happen locally!
- `bun one build && bun one serve --port 3333`
- Open http://localhost:3333 in Chrome/Safari → BUG REPRODUCES
- Open same URL in Playwright → NO BUG

## Next Steps
1. Find what triggers the hydration abandonment in real browsers
2. Create a test that doesn't use Playwright (maybe use Chrome CDP directly?)
3. Bisect the addeven code to find minimal reproduction
4. Check if it's related to SchemeProvider/TamaguiProvider/AnimatePresence
