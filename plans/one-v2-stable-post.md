# One v2 stable launch post

Owner: r54299. Branch: `launch/one-v2-stable-post`, derived from assembled
`9ea80d28b3d1843282df5855947faa694e2e90f5` and its durable site hydration patch.
Nate requested this rewrite directly after reviewing the earlier beta draft.

The post announces the full stable release. One Native leads: full SwiftUI
and Compose access, native UI already included, shared components, and the
expanding UIKit collection. Native services stay in that story. The package
replacement comparisons and separate tabs inventory are removed. The rest
of the framework work since the v1 beta is grouped by what it enables.

RAN: read the generated SwiftUI catalog, Compose adapter, One namespaces,
Swift package module generator, and Kotlin source plugin. Full framework
access includes custom native views imported into React; this wording does
not claim that every SDK symbol has a predefined JSX wrapper. Built-in
native UI has no separate per-component installation. Existing framework
peer dependencies remain documented in the setup and installation guides.

The post and setup guide use `npx one`, with application configuration in
Vite. Source CLI repair is assigned to s8122 on studio-64, off `v2-beta`.
It must preserve `v2-beta-starter`, select the matching native configuration,
and exercise the actual scaffold, installation, web build, and generated
native projects. No new setup command or migration API is requested.

The existing assembled branch's full CI run 37147404328 passed. That result
validates its code and hydration patch, not this later prose revision.
This revision still needs mounted desktop/mobile captures, served links,
and the assigned Claude Opus review before Nate sees it. Stable publication
and public-main landing remain gated. The post stays `draft: true`; its
October 5 date is the planned Monday launch and must match publication.

## Assigned review corrections

Claude Opus s8126 reviewed the stable post at `a187f637e` and CLI selection
at `703d1ecd2`. Its final handoff is
`~/.team-machine/handoffs/launch-one-stable-opus.md`. It accepted the Native
positioning and found two material problems before sharing: historical
unrelated npm One 2.x versions resolve broad ranges to 2.5.2, and imported
Swift view props are JSON rather than a derived specific TypeScript interface.

The setup guide now installs `one@latest --save-exact` and reads the default
tag's peers. The post describes generated declarations and native glue,
without promising typed Swift view props. The new source-import guide shows
Swift packages, Compose views, native methods, declarations, platform files,
and native rebuilds, and explicitly documents the `one prebuild` requirement.
Existing protocols and APIs retain their names. The guide is linked from the
post, overview, setup, and native sidebar. The framework section is shortened
to outcomes with links, and the historical wording is corrected to “since v1.”

TESTED: actual native-source generator reads both Swift examples and the
Compose example. The Swift manifest selects language mode 6; the declarations
typecheck all three React/TypeScript examples. A wrong Compose title type and
wrong Swift method argument both fail TypeScript as a negative control.
These checks do not claim a newly compiled native binary. Local script and
receipt: `~/Library/Caches/one-v2-stable-source-docs/`.

CLI s8122 also owns exact generated dependency versions and packaging repair.
Release preparation r54397 owns stable version selection, with 2.6.0 as the
reviewer's recommended candidate above legacy 2.5.2. Source and prepared
artifacts stay on branches; Nate retains stable version/publication approval.
Production capture worker s8128 must use this corrected source before the
final before/after share. No additional post review is requested.

## Upstream hydration release verification

RAN: the final upstream snapshot repair at Tamagui `9acbfd7147` is included
in `e092672461`, whose full Checks run
[37148867412](https://github.com/tamagui/tamagui/actions/runs/37148867412)
passed, including the starter size gate. The prior run was cancelled when
this newer source arrived; its starter and SSR jobs had already passed.

RAN: freshly packed `@tamagui/web@3.0.0-0.canary.1791056644527` has a source
hook byte-identical to the passed CI source. All five published web/native
JavaScript variants use the private ref snapshot, have no process-wide
`localStates` map, and pass Node syntax checks. Archive SHA-256:
`cf08a6fbc11bff736ecb15a9f49629fd0ba1fa1228119325d3806e9c746876f4`.
Raw pack metadata, source and distribution hashes, and checks are recorded
in `~/.team-machine/handoffs/one-tamagui-launch-evidence/theme-published/receipt.json`.
The normal auto-beta channel remains enabled and is being monitored
separately. This site retains its already validated v2.6.2 backport.
