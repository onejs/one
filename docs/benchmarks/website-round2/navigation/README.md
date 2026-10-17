# Navigation investigation

Source base: 342a602b0. Candidate: 1b6b4ba38; formatting-only successor 6edcd60fa. Control and candidate differ only in the installed compiled router module. Each arm regenerates its owned Vite cache through the same warmup before measurement.

RAN: page import followed the loader wrapper in the diagnostic network profile. CPU profiles perturb latency and are excluded from timing claims. The page-import ordering regression fails before and passes after; 16 focused tests pass.

The first quiet attempt in navigation-candidate stopped during control run 0. The HMR probe asserted the URL while navigation was still pending because its marker heading was already visible. This partial run is excluded. The corrected harness awaits the destination URL and its unique Route Structure heading, then checks the marker, same document and retained dark theme. Three alternating confirmation pairs remain pending.

The profiles and failed attempt are evidence only. No navigation improvement is accepted yet.

RAN first complete three-pair confirmation: first intro control 277.6/254.7/273.5ms versus candidate 239.0/250.5/245.7ms; first routing 266.1/254.4/250.3 versus 270.7/252.2/272.1; repeat intro 153.0/149.6/150.1 versus 152.0/167.3/144.1; repeat routing 146.1/147.7/147.0 versus 145.7/152.2/145.6. Start medians 212.0/186.7/148.0/129.3ms. All 24 One-arm HMR updates and nine Start HMR updates preserved document and dark theme. No browser exceptions occurred.

Candidate remains unaccepted: first-routing median increased, and fresh-context docs had optimizer reload outliers. The logs confirm optimized dependencies changed during the first docs request in each One arm. A second confirmation warms all six routes for each framework before restarting the measured server, using identical arm-specific regenerated caches. This addresses cache comparability; it does not erase the cold samples or establish their cause.

RAN matched-cache confirmation w-c8cc65: first intro medians control 267.0 versus candidate 268.1ms; first routing 251.3 versus 268.4ms; repeat intro 151.6 versus 152.0ms; repeat routing 147.1 versus 148.9ms. All document/theme HMR checks pass, and measured server logs contain no optimizer reload. Candidate 1b6b4ba38/6edcd60fa is rejected: the first-navigation gain did not reproduce and first routing increased again. No ready source PR is created. Next diagnostic counts route subtree commits and page/layout renders using the original control.
