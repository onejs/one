# One iOS engine benchmarks

This app compares the same One source in Release with shipped Hermes bytecode and Bun AoT. It requires the experimental engine branch and `ONE_BUN_ENGINE_DIR`. Debug is always Hermes. No network data is used.

From the repository root, run `scripts/bench/build-ios.sh hermes` and `scripts/bench/build-ios.sh bun` on a signing Mac. Both builds must use the same clean commit. Build Hermes first, then Bun; each prebuild regenerates the native project. The derived-data directory is reused and each finished app is copied out before switching engines. A build manifest records Xcode, bundle SHA-256 and installed app bytes. Generated projects, dependencies, toolchain, signing identity and engine binaries must be held constant. Build products default to `~/builders/.scratch/bun-bench`.

Launch with `--bench --bench-run <id>` to run everything and exit. Output is `BENCH {"app","engine","case","metric","value","unit","run"}` per sample, followed by `BENCH_DONE`. Errors print `BENCH_ERROR` and invalidate the launch. Engine identity comes from the running runtime, not a build label.

The suite measures:

- Startup from kernel process creation to the display-link tick after the initial React commit, then to a 20-row content screen. These are frame proxies, not optical first-pixel measurements. The initial measurement includes argument and metadata bridge calls. Native process elapsed uses the kernel wall-clock start time, so do not change the system clock during a run. RN's startup timestamps are also emitted when available, with bundle execution as a duration.
- Mount 1,000 non-collapsable views, 300 sequential committed updates of all 1,000 views, 100 nested native views, 300 long multilingual text rows, and a One navigation push to a 1,000-row screen. Each includes the display-link acknowledgement after commit, which includes frame scheduling and bridge overhead. The `react-commit-duration` metric separately sums update-to-layout-effect acknowledgement time before each native frame wait. It includes React scheduling and reconciliation and does not prove native presentation. The 300 updates intentionally wait for 300 frames; they measure paced UI updates and are not a pure JS throughput test. Navigation animations are disabled. All rows mount; this does not measure virtualized list scrolling.
- Fixed JSON, regex, numeric sort, object allocation, Intl and string workloads. Checksums are emitted to detect unequal work and prevent unobserved outputs. First invocation is measured with no engine-specific warmup.
- Physical footprint in MiB after startup and each case via `TASK_VM_INFO`. No forced GC, cache flush or memory-pressure simulation. Memory is sampled immediately after each case and includes engine GC policy.

On the signing Mac:

```sh
python3 scripts/bench/run-ios.py \
  --device 00008150-001808862187801C --device-name 'iPhone Air' --os '<actual version>' \
  --commit "$(git rev-parse HEAD)" \
  --app hermes="$HOME/builders/.scratch/bun-bench/apps/hermes/OneBench.app" \
  --app bun="$HOME/builders/.scratch/bun-bench/apps/bun/OneBench.app" \
  --out "$HOME/builders/.scratch/bun-bench/device-001"
```

The runner holds the shared phone lock throughout, installs each build as needed, uses `--terminate-existing`, and alternates AB then BA for ten launches per engine. These are process-cold launches with warm OS caches, not reboot-cold launches. Each console log is retained. Incomplete launches and coverage changes fail rather than silently dropping samples. Keep the phone unlocked, at a stable temperature and without other foreground workloads. Power mode and thermal state are captured at launch. Record OS version, battery and thermal conditions alongside the run. Installation between engines and the 10-second cooldown can affect caches and temperature; disclose that in published comparisons.

The generic report command accepts any app's BENCH lines:

```sh
python3 scripts/bench/report.py <console.log> ... --out <charts-dir> \
  --device 'iPhone Air' --os '<actual version>' --commit '<source commit>'
```

Raw JSON preserves every sample. Summary JSON reports count, median, quartiles and min/max; SVG bars show median, middle 50% and full observed range, with device, OS and commit. There is no outlier removal. The reporter rejects unequal checksums across engines and runs. Keep rich-app results and microbenchmarks separately labeled. Host-side runtime timings or simulator timings are not device performance evidence.
