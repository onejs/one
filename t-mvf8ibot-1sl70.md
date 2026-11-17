---
id: t-mvf8ibot-1sl70
title: Investigate RN content inside native containers and sustain release quality
status: done
owner_status:
  state: landed
  text: One2.9.0 stable published and verified;24 family packages latest, exact source and SDK bytes
  updated_at: 1792454468560
assignees:
- p95796
labels:
- lane:one-sdk
- umbrella:one-ios-coverage
backend: git
commits:
- 0591564bc1
- 176d60a6c3
- 1ff98085c2
- a025e8e8bd
- acd76c143e
- ad16059159
- b6b5cca6dc
created_at: 1792413147053
updated_at: 1792454468560
field_marks:
  active_form: 1792413147053
  assigned:p95796: 1792451273451
  assigned:p96232: 1792413239125
  body: 1792454468560
  claim: 1792413147053
  commit_linked:0591564bc1: 1792418265651
  commit_linked:176d60a6c3: 1792416269888
  commit_linked:1ff98085c2: 1792416269756
  commit_linked:a025e8e8bd: 1792417322092
  commit_linked:acd76c143e: 1792417870897
  commit_linked:ad16059159: 1792417839526
  commit_linked:b6b5cca6dc: 1792416269839
  evidence_summary: 1792413147053
  owner_status: 1792454468560
  parent: 1792413147053
  priority: 1792413147053
  recovery_ref: 1792413147053
  status: 1792454468560
  title: 1792413147053
  unassigned:p96232: 1792451273451
---
Direct owner2026-10-19 to p95796 authorizes one additional continuing Opus helper at medium effort to investigate UICollectionView RN cell content and broader generic native-container interop, then help review and finish this release until fully done and out. Staffing/model/account scope is this lane only, never standingpolicy. Feature direction recorded in Contrast plan one-ios-complete-coverage.md Native container interoperability. Initial deliverable: source-grounded usable vs partial/missing composition paths, shared cause, concrete generic repair and meaningful runtime proof limits; no list-of-names completeness claim. Currentleadp95796 owns artifact producer and PR961 CI; p95798 standing reviewer/s51006 native validator retained. Helper owns fresh nonduplicate release-quality slices afterward and remains assigned until released shipment, per explicitowner override to finish-after-onebatch. No spawns, no account resets/usagecredits/unpauses. Normal active subscription routing; medium effort. No merge/publication authority. Prior umbrella reference t-mvc2oey2-1p420 failed local parent lookup, preserve umbrella labels instead of inventing parent ownership.

Canonical tmrun receipt p96232 onPro128 sharedOneSDKtree. Dryrun resolvedclaude-opus5.5 medium, normalactive subscription routingtoapple(active20percent5h/11percentweek), no forcedaccount/unpause/reset/credits. Ownerexplicitcontinuingqualityrole throughreleasedshipment overrides one-reportfinish; initialreadonlyproductionaudit RNcontentinnativecontainers thenfreshnonduplicatequalityslices underp95796. Existing p95798review/s51006native and sole290producerw256227 untouched. Featureplan0088672c51e committed separately inContrast; staffingonlythistask. Taskparentlookup failed forhistoricalumbrella, umbrella/lanelabelsretained.

RAN actualp96232record live/running claude-opus5.5 medium parentp95796 exactsharedcwd, firstpromptdelivered andactualUIKitHost/OneNativeViews/SDK bridge filetoolsobserved. CountsoneverifiedactiveOpusqualityhelper, nocanonicalpendinglaunch. Existingsoleproducerwaitw256227 retained; newhelperindependentreadonlyinitialscope, no secondwatcher/helper/build. Continuesasowner-directedqualityrole afterinitialreport, staysassigneduntilreleasedshipment ratherthanfinishafteronebatch.

Initial interop report 2026-10-19 by p96232: /Users/n8/.cache/one-sdk-docs/interop-release-quality.md. Findings: (1) UIKitView is one-way, no React->SDK handle path (INFERRED source). (2) RAN scan of cache 27.1-a8f1e5828999c38e: 7 of ~12985 callback hints lack native c.callback; all UIKit cell plumbing (Swift diffable cellProvider x2, supplementaryViewProvider, Cell/SupplementaryRegistration handlers x4) emitted as c.arg(n) as <generic-nested alias> and always reject badArgument (INFERRED from OneSDKConvert.from fallthrough); cause INFERRED Bridge.functions alias expansion misses generic-nested aliases. Fix is codegen, held until sole full290 producer finishes. (3) Working path today is One SwiftUI List/Lazy containers + Slot, limited by required fixed Slot height and eager React mounting. Proposals: generator fix (existing contracts), optional measured Slot height (API, needs Nate), keyed native data-source driver for SDK UIKit containers (API, design only). No production source changed.

RAN batch49 fixes pushed 1ff98085c2 (empty layout reports 0) and b6b5cca6dc (zero crossing bypasses tolerance, per axis). Alias cause fixed in source 176d60a6c3: real UIKit Catalyst repro of 5 cast shapes, UIKit emit before/after, registration dispatch through real UIKit, verdicts unchanged over 432401 symbols, Combine/Network unchanged. Bindings not regenerated (lead producer). Report /Users/n8/.cache/one-sdk-docs/interop-release-quality.md updated.

Design candidate (source only, no production code) for React content in SDK-built UIKit containers: /Users/n8/.cache/one-sdk-docs/rn-in-uikit-containers-proposal.md. UIKitContent (onView handle, or source+item) plus cellSource(collection|table) returning the generated diffable data source with a native cell provider; reuses OneNativeViews table, OneNativeSlot.Container claim/decompose, presented extent measurement, Sheet touch handler. Report coverage wording corrected: UIKitView native proofs ed3b6f8b85/27784739a1 passed; COVERAGE row is only a missing maintained run.

RAN Opus delivered source-only rn-in-uikit-containers-proposal.md outsideproduction. Lead review identified concrete unresolved publiccallshape beforeownerask: UIKit native datasource creation requires async/main lifecycle; syncuseMemo example notaccepted, actualgenerated snapshot/apply/identifier/import paths needproof. Author revising Promise setup/teardown/stale-source handling, explicitduplicate rejection and measurement limits, no productionAPIcommit/build. Proposed genericUIView handle +nativecellprovider remains productdecisionpending. CurrentUIKitView native identity/a11y proofs explicitly preserved; missingmaintainedcoverage row not treatedasnomechanismproof. Standingreviewbatch50 aliasesunderway; native1ff/d968 warmbuildcontinuing.

Nate direct to originalauthor p96232 on2026-10-19, quoted in mail224: "Please go ahead with that plan to do the UI kit with react content". Accepted as directapproval toimplement revisedproposal UIKitContent,collectionCellSource,tableCellSource on SAME PR961 branch, no repeatownerquestion. Lead recordsfeature scope inContrastplan thisturn. Owner+ownaliasbatch50causefix first, oneleadfull290, then genericReactUIView+nativecellprovider implementation viaexistingSlot/Views/nativeUIKitnoJS synchronouscellpath. s51006 serialnativecompile/geometry/reuse/events/accessibility proof, standingreviewp95798. OpusremainsMEDIUM throughreleasedshipment, nohelper/buildproducer authority. Merge/stablerelease stillNate tm ask afterready.

Directfeatureapproval recorded inContrastplan commit81df666709bf; planshygiene+boardshape hookspassed. land.ts isolatingowncommit asad2b117665 becauseprimarymainholds unrelatedunlandedcommit; queuecommand in-flight, no claimmainlanded and no waitingforlandingverdict. Primaryfastforwardrefuseddivergence, preservedforeigncommit/source unchanged. Approvedscopequote remainsUIKitContent+collection/tableCellSource; no mergedrelease/stablepublicationauthority.

RAN independent Musefixturelaunch p96327 confirmedstarted onPro128 via md-contributor Spark1.3 contributor/max/cam active, same sharedtree, noforcedaccount/credits/reset. Owns only native-features fixture+smallestroute, notcoreSDK/interop; oneMuseoutofapprovedceiling4, no inventedminimum. DryrunCPU73.9percentidle/119GiBfree, actualfleetlistpartial (completefalse) so absence notusedasownershipproof; priorMusefinish/startfailreceipts retained. Opus p96232 MEDIUM corealias+approvedUIKitContent, standingSolp95798 independentreview, s51006 serialnative, leadsole290+CI. Separatefixturetaskcreatedunderinterop. Featureplanown81df normalizedad2b queuedticket000000000001792417487726-ad2b117-0f9315, no mainlandedclaim.

batch50 fix a025e8e8bd approved. UIKitContent ad16059159+acd76c143e under batch52 review; retained catalyst probe at ~/.cache/one-sdk-docs/uikitcontent-probe (15 PASS).

RAN b8bdb2f96e pushed, three UI paths only, no SDK fingerprint input. Author Catalyst24 and React-double5 prove retained view retirement/native-identity claims; original batch52 reviewer closure assigned p95798. INFERRED app impact remains for headless-tested late-registration row sizing: s51006 assigned collection/table empty-native-snapshot then remount/update/width proof via fixture0ff after coherent alias ABI. Full alias producer w-7deb40 remains sole wait; no second build requested.

Owner DIRECT 2026-10-19 to p95796: "Get rid of the standing review we don't need it since we're running all large models the opus and you guys can just review each other". Dedicated reviewer p95798 stopped at owner request; do not resume, replace or restaff that reviewer seat. Existing findings/evidence retained. Lead p95796 (Codex) reviews Opus p96232 code including batch52 fix b8bdb2f96e; Opus reviews lead fixture/artifact changes. Native validator s51006 and release approval holds unchanged.

TESTED independent Codex review b8bdb2f96e+4177b2896d: real UIKit Catalyst24 retirement controls,10 compositional/table remeasure controls and5 real React claim/rejection controls PASS. Additional real UICollectionViewFlowLayout control aborts exit134: remeasure creates base UICollectionViewLayoutInvalidationContext instead of layout-required subclass. Concrete stack/evidence uikit-content-independent-review/flow-runtime.log; original author p96232 assigned generic context repair. No full app/Fabric claim. Existing dedicated review seat remains owner-stopped.

Independent Codex review closure: b8 retirement/canonical claims/rejection and both retirement exits read; real UIKit Catalyst24+10 and real React doubled-transport5 passed. Found real flow-layout abort in4177, original author39cca fixes through layout shouldInvalidate/invalidationContext self-sizing contract; exact prior failing flow probe independently now10 PASS. No remaining blocking source finding in this bounded batch. UIKitContent on-device/Fabric touches/reuse/performance unproven and assigned s51006. Source and evidence preserved; no dedicated reviewer restaffing.

Owner2026-10-19 asks "Guys, do we really need100%coverage?" then corrects "I definitely didn’t say that". No owner request for100percent coverage or exhaustive SDK validation exists. Lead acknowledged overextended scope. Keep work to approved UIKit bridge, concrete release bugs and focused native proof; existing repository fixture-inventory assertion is not owner product direction. Bounded maintained smoke only as concrete current-CI repair, no exhaustive matrix, no new acceptance gates.

RAN Opus cross-review8919b747af+41c48acb29 APPROVED and nativeCoverage1/1 PASS; platform resolver matches actual fixture variants and no currently affected edge loses references. Public usage guide80ec9b6ee6 APPROVED with author fix-forward015559a66f clarifying same-native-source duplicate mounts throw and React content updates remeasure in place without reconfigureItems. New source-free docs patch does not change SDK ABI0e503. Native100c runtime app proof remains in s51006 queue, lead sole exact wait w-91fa02 retained; no dedicated reviewer revived and no exhaustive100percent scope.

Read original owner quote in Contrast milestone Chat test app: realistic UIKit chat lists/conversation with many items and bounded other-native-UI stress; optional Sonnet task-specific. Separate tm/chat-test13ae7b53fd+d5d72572a7 based0f retained, test-only/no publicAPI/no PR961 merge. Lead queued s51006 one lower-priority route/Sweep/capture unit after release-critical UIKitContent proof, no interruption/parallelbuild/new release gate. Runtime/native inputs must be compared before source switch; preserve release app/pair. Simulator frames are not device performance proof. Continuing Opus helper owns test branch/source; no dedicated review seat revival.

TESTED peerp96232 approves lead579550 Sheet test repair, focused10/10PASS. Author native035503d9dc now ancestor of579; register/unregister visible matching cells posts coalesced UIAccessibility.layoutChanged, scroll reuse stays silent. Source review no blocking finding; claimed cachedAX cause remains INFERRED until rebuilt app removes ghost ID. Author headlessCatalyst10 sizing controlsPASS, driverunchanged. Routed ONE warm app changed-target rebuild/install exact579550ce8d to s51006, sameABI0e503/facades/pods/provider, no prebuild/full290gen or dependency upgrade. Preserve100c negative binary/evidence/DD; original AX-ID absence assertion must pass before remount/replacement. Chattest app still separate/lowerpriority. No dedicated reviewer restored.

RAN s51006 exact579 warm rebuild/install startupPASS, binarya6a0a44f...4a979d ABI0e503. Unchanged0f7 smoke w-d2a002 fails same original unmountID-absence assertion after collection/table presses and resize pass. Saved rowGenericElement remains zero-frame/nil-label, screenshotcollectionempty. This disproves notification-only repair satisfying contract; no execution/rootcause claim without native trace. Originalauthorp96232 already notified; requested bounded liveUIView/holder vs cellAXcontainer vs externalcache diagnosis on held579 before another speculative patch/build. No assertion relaxation/retry/extra producer. Preserve100c negative and579 currentbinary/evidence/DD.

RAN259 native inprocess579 read: row1testID absent among280livewindowviews; firstcollectioncell holderEMPTY361x44, cell/contentView/holder accessibilityElements=nil/countNSNotFound. ExternalAXsnapshot stillserializeszeroXYWH/null-label/emptychildren GenericElement, enabled=true. This rules out live Reactrow retention under checkedholder, not exact AXcache origin. Lead independently readsavednative/AXartifacts; originalauthorp96232 evaluates public-API a11y correction versus an overstrict ID-absence oracle. Any proposed driver correction must checkallmatchingrows and failpositive geometry/content/actions; mounted/reconfigured snapshots negative controls. No privateAXwork or speculative rebuild solely to clearplaceholder. Existingfailureevidence preserved.

Peer source review APPROVED f92902faca+22e1f4d4a7: unmount checks every matching ID, rejects positive dimensions/accessibilitylabel/value0/title/help/children/customactions; positive-frame selection prevents cachedplaceholder standing in for mountedrow. Author realready/reconfigured negative snapshots reject; bareghost passes; synthetic accessibilitycontent variants reject. Native259 tree proved actualremoval, so this is oraclecause repair, not skipping nativecleanup. Notification-onlycode removed by author519043c5fc (mail262 refers c6ab source but actual branch519). s51006 authorized one DRIVERONLY22e1 mirror/rerun on exactheld579/ABI0e503; report native579 stillincludes035, no currentbranchruntimeclaim. No rebuildnow; exactfinalnative canbatch later.

RELAYED RAN265 authorp96232 cites s53620 binaryread on iOS27build24A434: UICollectionViewCell accessibility child cache clears through cell-level subview/reuse hooks; nested holder removal may nottrigger those, and nonautomationVoiceOver alsohascache. INFERRED only: zero-sized/unlabeled externalentry mightpersistforVoiceOver, no focus/announcement behavior proven. No nativechange/deviceVoiceOvermatrix/releasegate added from this source-onlyclaim. Driver22e1 remainsreviewed; actualremoval proven259; nativevisibility/touch/remount proofcontinues s51006. Source/binaryreadrelay does notstrengthenevidence or prove a productdefect.

RAN267 w-ac9a8d3m08 held579 native/driver22: correctedunmountPASS. Remount pressed, rows1v2/2..4 visuallyrestored+summarymounted/Unmount, but savedAX containsNO collection-press-1 (notzeroghost), host16,286.33,361,320. inside()timesout, no remountpress3/replacement4 reached. Preserveassertion; accessibilityrediscovery now actualfailingcontractcandidate, no coordinatebypass. Authorp96232 requested bounded native freshID/holder/publiccellAXvsclient trace on preservedremountedstate, causeproof before nextbuild. No currentbranchnativeacceptance, no retries or passclaim.

RELAYED RAN269 authorread: savedremountAX4visiblecells expose stalezero-frame entries labelledrows197..200 while screenshotshowsrow1v2/2..4. INFERRED cellAXcache survivesholdercontentswap; wrongVoiceOverreading plausible but notdirectlyexercised. Authorrequested live freshrow/nativecache read from s51006 beforepatch; publiccell-directholder/readdcandidate unbuilt and notapprovedasnecessarydesign. Keep accessibilityrestoration contract; no assertionbypass or speculativebuild.

RAN271 directnative remountdiscriminator on held579/driver22: firstcellliveholder contains correctpress1/row1v2; cellstoredaccessibilityChildrenElements stillcontains detachedpress200, window=nil/oldparent0. automationidle0/globalAXServercachemiss distinguish populatedcellstoredcache. Receipt ~/.cache/one-sdk-docs/579-driver22-uikit-content/remount-native-discriminator.md +live-remounted*. Observerdetached, no mutation/replay/build. Confirms nativecellaccessibilitycache staleacrosscontentswap; not just externaltestdrivercache. Authorp96232 receiveddirect, owns boundedpublicUIKitcausefix/probe; do not weaken restoredrowAX/press requirements or claim VoiceOverdevice behavior actuallytested.

Source23f90894ee reviewed: holder didAddSubview/willRemoveSubview callbacks weaklynotifycell; collection/table reinsertowncontentView at originalindex, preservingorder byconstruction; noSDKfingerprintinput. iOSswiftctypecheckpassed perauthor, notappbuild. DirectaddSubviewcausalprobe hadprecedingpublic[] mutation; authorinfersnonconfound, leadrequestedoneuntouchedstalecellcontrol beforepinningbuild. insertSubviewpath binaryreadrelayed, not claimed actualnativeexecuted. Currentappstill579/driver22 experimentallymutatedcells, preserveevidence; no productionfixacceptance or repeatedsmoke untilsource-pathreceipt.

RAN285 exactinsertSubview(contentView,currentindex) on untouchedstalecell199 withoriginalpublicAXnil clearsstoredcache; nextAXlivepress2positive/stale199gone, controls198/197remainstale. Order/frame/publicnil unchanged, no setterconfound/fallback/replay. Source23f90894ee peerreviewAPPROVED with callbackweakcapture/indexpreservation. Routed ONE warm app changedtarget build/install cleanFF23f, sameABI0e503/pods/provider/DD, no prebuild/fullgen/dependencyupgrade. Includes519removal of035andproductionholdercallbacks. Currentdriver22unchanged, preserve579negative/probepacket; firstactualfailureonce, lifecycleacceptancependingcleannewbinary.

RAN291 s51006 cleanproduction23f90894ee/driver22 UIKitContent smoke w7f57ffPASS3m44, noLLDBmutation. Newbinary4feb112bb629e2cda900ee983544ceb78936bd5c02bad5e71d1a672daacb9a3c ABI0e503. Collection/tableReactpress, stackbadge, rowheightgrowth, unmountreachable-contentcheck, remountliveframe+press3, generation1replacement+press4 allPASS. Exactreceipt ~/.cache/one-sdk-docs/23f-driver22-uikit-content/native-proof-receipt.json and3nativeWebPs; screenshotinspectionleadpending. This closes currentnativeAXremount/reuseblocker and firstboundedUIKitbridgeacceptance, notexhaustivereuse/late-registration/width/performanceclaim. Nativevalidatorcontinuesalreadyapprovedsameappgroups/Pagerqueue; separateOpusgeneratorplanunderway. No stablepublish/mergeapproval inferred.

2026-10-19: p96232 transferred to lead p95796 at close-out; scope frozen at release candidate per owner direction, no unfinished p96232 source pending.

TESTED stable Release39341475834 SUCCESS. v2.9.0 tag and main28cc4531bbc4fa1e392a92dc05529d318278d832 exact. npm one@2.9.0 source28cc/ABI212edf3d13b127f5/290frameworks;580 facade-declaration files plus8 runtime/native/built files exact against reviewed8293. All24 published family versions/latest/source verified. Tarball SHA25664594e62d19dc67bbcd130ba2849eae2f82b0f5ee1cf1815e06e85fbf37a65ac, receipt ~/.cache/one-sdk-docs/stable-2.9.0/verified-receipt.json. No pending release blocker, no new device proof claimed.
