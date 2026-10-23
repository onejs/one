# native networking proof

Run `python3 tests/macos-basic/probe/networking-server.py` for the loopback echo,
503 and slow endpoints on port 18989. The existing local daemon must serve
`http://127.0.0.1:7777/api/zero/health`.

Transpile `networking.ts` with the installed Bun TypeScript transpiler and append
the result to a saved macOS development bundle. Load that bundle in the native
host through `ONE_MACOS_BUNDLE_URL`. This exercises the installed RN fetch/XHR
adapters without changing the app entry or routing fixtures. The host writes to macOS unified logging and
prints `[networking-proof]` results; `FAILED` means the proof did not pass.

After `reload-pending`, the first proof runtime asks DevSettings to reload the
host while its slow request is active. The server carries the run counter across
reload. The next runtime must repeat the successful proof. Before that new run,
the old runtime must not print `old-request-completed`. Stop the owned server
and host after collecting logs.

The host implements HTTP(S), text/base64/blob responses, text/base64/blob
request bodies, response and upload events, incremental data/progress, timeout,
abort and shared cookie clearing. Blob creation, slices, release and FileReader
text/data URL reads use bytes owned by the JS runtime. Blob collectors release
bytes when JS blobs are collected. URI and multipart bodies report an explicit
request error. Sending blobs over WebSocket is unsupported; existing text and
base64 WebSocket transport is unchanged.
