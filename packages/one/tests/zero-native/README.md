# Native Zero experiment

The experimental `one/zero/native` entry uses a C++20 engine through Nitro. The
engine links the SQLite library already supplied by One's OP-SQLite dependency.
It does not bundle another SQLite implementation. `cpp/zero/Client.hpp` has no
React Native, Nitro or JSI dependency and can be extracted separately.

SQLite owns the server snapshot, optimistic view, mutation journal, client
identity, cursor and desired-query sequence. A pull, acknowledgement and replay
commit together. Application mutators remain JavaScript callbacks and use an
asynchronous native transaction. The TypeScript facade serializes local calls and
publishes subscriptions after commits. The transport currently uses explicit
Orez HTTP pull/push calls outside the local transaction queue, so a stalled fetch
does not block local reads or writes.

## Using the slice

```ts
import { createNativeZero, createOrezTransport } from 'one/zero/native'

const client = await createNativeZero({
  name: storeName,
  schema,
  mutators: {
    message: {
      async send(tx, args) {
        // use the application's existing mutator with its expected context
        return messageSend({ tx, authData, environment: 'client', can }, args)
      },
    },
  },
  transport: createOrezTransport({
    server,
    appID,
    schemaVersion,
    headers: () => ({ Authorization: `Bearer ${token}` }),
  }),
})

await client.pull([{ hash: queryHash, ast: sessionsQuery.ast }])
const unsubscribe = client.subscribe(sessionsQuery, setSessions)
await client.mutate('message.send', messageArguments)
await client.push()
await client.pull()
unsubscribe()
await client.close()
```

Queries accept the pinned Zero builder's `ast` and `format`. Mutators receive
`tx.run(query)` and `tx.mutate[table].insert/upsert/update/delete(row)`. The factory
is asynchronous. `state()` and `pending()` expose durable sync state. Push success
alone never removes pending writes; a subsequent pull must acknowledge them.

Use a stable store name scoped to server, authenticated identity and logical
client. The store generates and persists its client ID; an optional `clientID`
override must match an existing store. A schema change clears the server snapshot
and cursor while preserving pending mutations for replay after a fresh pull.
The first slice uses one durable client per group, so `clientGroupID` equals
`clientID`. The native directory is excluded from iOS backup and uses Android's
no-backup storage. A server acknowledgement beyond the local journal sets
`state().recoveryRequired` and blocks further mutations and pushes, preserving
the journal for reconciliation. It does not automatically assign a new identity
and resend commands that the server may already have executed.

It uses a separate SQLite file and does not migrate existing Replicache stores.
Do not switch an account with pending mutations to the experiment until the
adoption path settles or preserves those mutations.

## Reproducing the checks

From `packages/one`, with artifacts outside the checkout:

```sh
ONE_ZERO_TEST_DIR=/path/to/task-scratch \
ONE_ZERO_SQLITE_ROOT=/path/to/app/node_modules/@op-engineering/op-sqlite \
ONE_ZERO_REFERENCE=/path/to/app/node_modules/@rocicorp/zero/out/zero/src/zero.js \
bun run test:zero-native

ONE_ZERO_TEST_DIR=/path/to/task-scratch \
ONE_ZERO_DEPENDENCIES=/path/to/installed-app \
ONE_ZERO_HERMES_ROOT=/path/to/extracted-hermes-distribution \
bun run test:zero-nitro
```

The first command builds the pure engine and runs durable optimistic/replay,
rollback, acknowledgement, subscription, abrupt process-exit and HTTP transport
scenarios. It also compares ordered and nested results with the executable Zero
reference. The reference is required; the comparison cannot silently skip.
`ONE_ZERO_DRIVER` can reuse an already built driver. Without
`ONE_ZERO_SQLITE_ROOT`, the desktop build links system SQLite.

The second command embeds real Hermes, Nitro and the generated OneZero spec. It
uses an installed app's React Native, Nitro, OP-SQLite, esbuild, Babel preset and
abort-controller dependencies. Hermes is supplied separately as the matching
React Native framework distribution. No downloaded runtime is committed.
`ONE_ZERO_SIMULATOR=<claimed-udid>` builds and runs the same probe for an arm64
iOS simulator instead of macOS. Claim and boot the simulator before running it.
`ONE_ZERO_SQLITE=0` builds the bridge without the SQLite engine and checks its
explicit unavailable-backend error. One selects this configuration automatically
for OP-SQLite's libsql and turso modes; native Zero currently requires SQLite.

The initial reference is `@natew/zero-client@1.9.0-orez.2-client.1`, installed
under the `@rocicorp/zero` alias by Team Machine. The runtime probe uses Nitro
0.37.1, React Native 0.88 and Hermes 260318099.0.4. Record the actual installed
versions when comparing another reference.

The upstream source reference is
[`zero/v1.9.0`, commit 53aaf364](https://github.com/rocicorp/mono/tree/53aaf364c188121d160eca3ac713a66e38eef33f).
The ordered replay scenario adapts the observable assertions in
`packages/replicache/src/db/rebase.test.ts`, `with sequence of mutations`:
unacknowledged callbacks replay in order, retaining their name, ID, arguments,
client and timestamp. It exercises SQLite rows rather than Replicache's DAG and
B-tree internals. The executable query comparison covers a different boundary
and does not run the original upstream test files unchanged.

`packages/zero-client/src/client/zero-poke-handler.test.ts` supplies the next
protocol cases: multipart assembly, renamed tables/columns, base-cookie
matching and server columns absent from the client schema. Only complete pull
responses, name mapping, server schema drift and base-cookie checks are
implemented here. Unknown server tables are skipped and additional server
columns are retained, matching the pinned client. Unlike
upstream's missing-mutator rebase case, this slice rejects a missing callback
and preserves the prior state and journal. These differences require explicit
adoption decisions and additional compatibility work.

## Compatibility evidence and remaining work

| Behavior                                                                                                     | Evidence                                                |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Optimistic writes, callback replay, rollback and acknowledgement                                             | Native driver integration and Hermes/Nitro runtime      |
| Pending writes, complete view and cursor survive reopen                                                      | Native driver integration and Hermes/Nitro runtime      |
| Process exits during an uncommitted write                                                                    | Native driver integration                               |
| Local work during a stalled pull, duplicate insert, partial upsert, server drift, schema change and recovery fencing | Native driver integration |
| Wrapped Orez application errors and durable desired queries                                                  | Local HTTP integration                                  |
| Filters, UTF-8 ordering, limits, cursors, null/JSON, singular results, related queries and correlated EXISTS | 18 cases compared with the pinned Zero executable       |
| Team Machine schema, session/message queries, original message.send replay, session.stop and durable reopen                  | Consumer-source probe through Nitro/Hermes on iOS, recorded with the experiment task |
| Existing React provider and hooks, live reconnect and mobile screens                                         | Pending                                                 |
| Android app packaging, cloud encrypted transport and multiple identity/client adoption                       | Pending                                                 |
| Pinned upstream WebSocket protocol, storage recovery and full upstream suite                                 | Pending                                                 |
| Production device performance and binary-size comparison                                                     | Pending                                                 |

The generic runtime probe exercises the generated bridge, generated identity
across reopen, caught write errors and the native backup exclusion. The iOS
target compiles at One's minimum iOS 17.
This harness embeds the generated bridge directly; it does not establish that
the complete One CocoaPods target or the consumer application's UI builds.
`ONE_ZERO_PROBE=/path/to/consumer-probe.ts` selects a consumer-specific entry
while retaining the same native engine and bridge.

Unsupported Unicode ILIKE and hidden relationship flattening throw explicitly.
There is no automatic wake/reconnect scheduling, query materialization API or
drop-in `on-zero` provider yet. Subscriptions requery after commits; this slice
has expression indexes for primary keys and relationship destination fields,
but no incremental view maintenance. Unchanged pulls skip rebuilding the view;
changed pulls still copy the full server snapshot and replay pending callbacks.
The JSON parser still uses SQLite's JSON functions. The generic HTTP
adapter does not implement Team Machine cloud encryption. No performance win
or full Zero compatibility is established by these checks. Keep the installed
applications on their existing client until their integration and recovery
contracts are covered.
