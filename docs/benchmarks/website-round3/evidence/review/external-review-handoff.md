# Handoff: independent review of One SSR external optimization

Verdict: APPROVE. Full review: /private/tmp/one-start-round3-s44967/external-review.md

Reviewed the `autoDepOptimizePlugin` diff (committed during review as 40c7b29d4, identical to reviewed diff) and new regression `autoDepOptimizeExternal.test.ts`, read-only.

RAN: focused regression 2/2 via `tm window run heavy --local --narrow -- bun run test -- src/plugins/autoDepOptimizeExternal.test.ts` from packages/vxrn; nearby scanner/merge/vendor suites 19/19; `tsc --noEmit` clean.

TESTED via disposable real-server probe (removed afterward, packages/vxrn tree clean): `external: true` bundles nothing and loads; user external+noExternal conflict still keeps the external dep out of the optimizer. Counterexample found: `external` passed only via plugin props is overwritten by `cfg.ssr?.external` (line 51) and ignored. Non-blocking since no caller passes it; owed fix: `cfg.ssr?.external ?? props.external`.

Owed cleanup: legacy `autoDepOptimizePlugin.test.ts` tests a local reimplementation, never the real function; fold into the new regression.

Residual risks and details are in the review file. No source edited. CI owner: ci-manager. REVIEW: none.
