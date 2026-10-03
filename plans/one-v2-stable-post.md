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
