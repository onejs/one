# Vendored Satteri runtime

This is the runtime-only WASI-free WebAssembly build from
[`bruits/satteri`](https://github.com/bruits/satteri), commit `963d1d3`.
and this checkout cannot push to the upstream repository. The upstream change
is tracked in [bruits/satteri#248](https://github.com/bruits/satteri/pull/248).

The vendored code is MIT licensed. It contains only the MDX-to-HAST runtime and
omits Satteri's JavaScript generator.
