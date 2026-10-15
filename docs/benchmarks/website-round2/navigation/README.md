# Navigation investigation

Source base: 342a602b0. Candidate: 1b6b4ba38; formatting-only successor 6edcd60fa. Control and candidate differ only in the installed compiled router module. Each arm regenerates its owned Vite cache through the same warmup before measurement.

RAN: page import followed the loader wrapper in the diagnostic network profile. CPU profiles perturb latency and are excluded from timing claims. The page-import ordering regression fails before and passes after; 16 focused tests pass.

The first quiet attempt in navigation-candidate stopped during control run 0. The HMR probe asserted the URL while navigation was still pending because its marker heading was already visible. This partial run is excluded. The corrected harness awaits the destination URL and its unique Route Structure heading, then checks the marker, same document and retained dark theme. Three alternating confirmation pairs remain pending.

The profiles and failed attempt are evidence only. No navigation improvement is accepted yet.
