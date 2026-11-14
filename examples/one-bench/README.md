# One iOS engine benchmarks

This app compares the same One source in Release with shipped Hermes bytecode and Bun AoT. It requires the experimental engine branch and `ONE_BUN_ENGINE_DIR`. Debug is always Hermes. No network data is used.

From the repository root, run `scripts/bench/build-ios.sh hermes` and `scripts/bench/build-ios.sh bun` on a signing Mac. Both builds must use the same clean commit. Device builds use `dev.onestack.bench.hermes` and `dev.onestack.bench.bun`, so both can stay installed while launches alternate; app source and React module name are identical. Build Hermes first, then Bun; each prebuild regenerates the native project. The derived-data directory is reused and each finished app is copied out before switching engines. Only the app products are removed before building so a prior engine cannot leave frameworks in the next app; compiled dependency outputs remain cached. For JS-only iterations after prebuilding the selected engine, pass `--no-prebuild` as the third build-script argument. A change to engine selection, native sources, config or dependencies requires prebuilding. A build manifest records Xcode, bundle SHA-256, Bun framework hashes and installed app bytes. The build verifies Hermes bytecode magic or the Bun compiled-entry marker and frameworks; the suite refuses Debug runs. Generated projects, dependencies, toolchain, signing identity and engine binaries must be held constant. Build products default to `~/builders/.scratch/bun-bench`.

Launch with `--bench --bench-run <id>` to run everything and exit. Output is `BENCH {"app","engine","case","metric","value","unit","run"}` per sample, followed by `BENCH_DONE`. Errors print `BENCH_ERROR` and invalidate the launch. Engine identity comes from the running runtime, not a build label.

The suite measures:

- Startup from kernel process creation to the display-link tick after the initial React commit, then to a 20-row content screen. These are frame proxies, not optical first-pixel measurements. The initial measurement includes argument and metadata bridge calls. Native process elapsed uses the kernel wall-clock start time, so do not change the system clock during a run. RN's startup timestamps are also emitted when available, with runtime-to-startup-end and bundle-to-startup-end durations (RN 0.88 exposes the end marker as `endTime`). The runtime-init and bundle-start markers can appear in reversed order by microseconds, so their difference is not treated as an initialization duration.
- Mount 1,000 non-collapsable views, 300 sequential committed updates of all 1,000 views, 100 nested native views, 300 long multilingual text rows, and a One navigation push to a 1,000-row screen. Each includes the display-link acknowledgement after commit, which includes frame scheduling and bridge overhead. The `react-commit-duration` metric separately sums update-to-layout-effect acknowledgement time before each native frame wait. It includes React scheduling and reconciliation and does not prove native presentation. The 300 updates intentionally wait for 300 frames; they measure paced UI updates and are not a pure JS throughput test. Navigation animations are disabled. All rows mount; this does not measure virtualized list scrolling.
- Fixed JSON, regex, numeric sort, object allocation, Intl and string workloads. Checksums are emitted to detect unequal work and prevent unobserved outputs. First invocation is measured with no engine-specific warmup.
- Physical footprint in MiB after startup and each case via `TASK_VM_INFO`. No forced GC, cache flush or memory-pressure simulation. Memory is sampled immediately after each case and includes engine GC policy.

On the signing Mac:

```sh
bun scripts/bench/run-ios.ts \
  --device 00008150-001808862187801C --device-name 'iPhone Air' --os '<actual version>' \
  --commit "$(git rev-parse HEAD)" \
  --app hermes="$HOME/builders/.scratch/bun-bench/apps/hermes/OneBench.app" \
  --app bun="$HOME/builders/.scratch/bun-bench/apps/bun/OneBench.app" \
  --out "$HOME/builders/.scratch/bun-bench/device-001"
```

The runner holds the shared phone lock throughout, installs each build as needed, uses `--terminate-existing`, and alternates AB for ten launches per engine (`--order balanced` selects AB then BA). These are process-cold launches with warm OS caches, not reboot-cold launches. Each console log is retained. Incomplete launches and coverage changes fail rather than silently dropping samples. Keep the phone unlocked, at a stable temperature and without other foreground workloads. Power mode and thermal state are captured at launch. Record OS version, battery and thermal conditions alongside the run. The runner installs each distinct bundle ID once. If external apps reuse one ID across engines, it reinstalls on each switch; disclose that in published comparisons. The 10-second cooldown and retained OS caches are part of the measurement conditions.

Apps that remain open after their benchmark, such as Team Machine, can use `run-ios.ts --stop-on-done`. The runner streams console output to disk, stops capture on `BENCH_DONE` or `BENCH_ERROR`, and treats an error marker as a failed run. It terminates its own devicectl process; the next launch uses `--terminate-existing` before starting the next process-cold run. A `BENCH_ERROR` marker or an iOS locked-device launch refusal always stops capture immediately, including without `--stop-on-done`. The app must send BENCH lines to the console that devicectl captures. BENCH_META may include `app` and `engine` alongside `os`.

The generic report command accepts any app's BENCH lines:

```sh
bun scripts/bench/report.ts <console.log> ... --out <charts-dir> \
  --device 'iPhone Air' --os '<actual version>' --commit '<source commit>'
```

Raw JSON preserves every sample. Summary JSON reports count, median, quartiles and min/max; SVG bars show median, middle 50% and full observed range, with device, OS and commit. There is no outlier removal. The reporter rejects unequal checksums across engines and runs. Keep rich-app results and microbenchmarks separately labeled. Host-side runtime timings or simulator timings are not device performance evidence.

## Simulator comparisons

For back-to-back simulator comparisons, build both Release engines with `scripts/bench/build-ios.sh hermes simulator` and `scripts/bench/build-ios.sh bun simulator`. The simulator runtime and compiler must match. Each engine gets a distinct bundle ID on simulator as well as device.

Run the same collector with `--simulator <claimed-booted-UDID>` instead of `--device`, `--host <machine-name>`, `--device-name 'iPhone 17 Pro'`, `--os <simulator-version>` and `--cooldown 0`. Keep the two `--app` paths and source commit as above. It installs each app once, alternates AB until there are ten samples per engine, and produces the same raw JSON, summary and SVGs. The chart labels include simulator and host. Simulator results describe the simulator on that Mac and are not evidence of iPhone device performance.

Simulator Bun defaults to allowing JIT. For an AoT comparison, pass `--engine-env bun:BUN_JSC_useJIT=false --engine-env bun:BUN_JSC_useWasm=false`. The collector prefixes these with `SIMCTL_CHILD_` for Bun's launch only; Hermes is unchanged. Raw metadata records the per-engine environment and the chart method labels JIT/Wasm off. This still measures a Mac simulator, not an iPhone. Start with one launch per engine before the ten-run series.

Apps that need host memory samples can emit `BENCH_PHASE {"app":"team-machine","case":"frozen-fleet-startup","run":0}`. On simulator, the collector finds that installed app's live executable and records the kernel `proc_pid_rusage` physical footprint counter as `host-physical-footprint` in MiB for the named case. It also samples `case: "complete"` on `BENCH_DONE`, before stopping console capture. The app must remain running until capture stops. Raw kernel counter output is retained with the console log. Emit another named phase after open-chat if that stage needs its own label. The micro app uses its native footprint samples and emits no phase markers, so host sampling adds no work to its timed cases.

The tools use TypeScript and Node APIs, with Bun as the script runner. A small SDK-only C helper reads the cross-process kernel footprint counter. Simulator ownership comes from sim-claim. Physical-device runs use the system `flock` executable around the whole collector; no JavaScript FFI or library dependency is needed.

For apps whose native logger emits only unified-log events, add `--simulator-log-process TeamMachine`. The collector starts `simctl spawn <id> log stream`, waits for its `Filtering the log data` banner, and launches the app separately with the engine environment. It samples phases and completion, then stops only the log stream; the app remains available for captures. Launch output is kept in a separate receipt. `--reset-data` uninstalls and reinstalls the selected app before every launch, clearing its app-container route and preference state. Both options require `--simulator` and are recorded in metadata. Neither is needed for the micro app.
