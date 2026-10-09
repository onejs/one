These are unchanged offline crops from the matched SDK27 Apple-only and One native September 11 calendar captures retained in `one-native-calendar-r72081`. They supplement live conformance; they do not establish runtime selection, callback forwarding, or aggregate acceptance.

The existing Date Group anchor plus `(265,149,55,55)` points resolves to pixel bounds `(849,1407,1014,1573)` through `extractCrop` floor/ceil, producing 165x166 pixels. No resizing, painting, or tint adjustment was applied. The independent Apple calendar and One calendar compare at 0 changed RGB20 pixels of 1,169,460 in the prior retained gate. Both original blue-only measurements are 0 against the unchanged 5,000 floor. Both structural crop scores are 7,200.

Source raw PNG SHA256:

- One `one-original-stop.png`: `105e407387491651456152ca0fbbe83edb7f6778ef0da6c1e8f4383ee02e029a`
- Apple `oracle-final-before.png`: `0dacbcc81a0abd4d80e2ba9dfe38a2aa73271ac1f491a7eadbf80e3f67e4a432`

These hashes were measured on the transferred captures. Cross-machine source hash verification remains pending while pro64 transport is unavailable. Apple source SHA256 recorded by the owning oracle task: `7e2aa49ce8793ea1f448cfd37a77eabfad3693fa0c146fe37986fcdfb155805e`; Apple executable: `f3c6bb306360cdc077b626bdd254cd0554512b323467287b0b21c1e5fa028eb4`. Same SDK27.0/24A430, iPhone16 iOS27.0/24A434, en_US/Honolulu, date, range and components. No independent Apple rebuild is required for this pixel-only calibration.

`bun test tests/native-features/scripts/calendar-selection.test.ts` reads these native positives and applies explicitly offline omission/shape controls to copies. Live normal-server pickers, the natural wheel negative, callback omission/restoration, cost measurement, and the aggregate first next failure are still pending. No 70-image historical corpus claim is carried forward.
