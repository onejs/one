# One native real-app matrix

Current final artifact is `2.0.0-0.canary.1791082782289`, sourced from
`a4c1ed5a561604bdb05fed10540f8576591274ef`. RAN: packed One and vxrn
manifests and changed native files were checked. The final clean native matrix
is in progress. The beta.168.1 table below is the retained negative run.

RAN: the fresh Basic clean install, exact navigation graph, web build and web
runtime pass on this artifact, including `/tabs/profile`. Evidence is
`/tmp/one-realapps-basic-current-matrix.json` and
`/tmp/one-realapps-basic-current-clean.md`; native compilation runs on CI64.

Open platform gap: Contrast imports ArrangementView for its regular-width
layout. Its native API requires iOS 27.1. The allowed iPhone 16/17 Pro pool
runs 27.0; the installed 27.1 runtime supports only iPhone Duo and rejects an
iPhone 17 Pro with `Incompatible device`. Manager disposition: no pool
exception. Prove Contrast's compact phone path on 27.0 and retain 27.1
ArrangementView rendering as an open gap until a compatible pool runtime exists.
The fixture's deliberate unsupported call is retained in
`/tmp/one-realapps-contrast-ios-imported-primitives/api-results.json` and does
not count as a rendering pass.

RAN: One 2.0.0-beta.168.1; One checkout 8172a63f49aca02146080a89b673a894b81855bd; started 2026-10-03T22:15:29.104Z.

Saved run: `/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl`. Full output and machine-readable state: [matrix.json](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/matrix.json).

| app | clean install | web build | web runtime | iOS build/run | Android build/run | API coverage |
| --- | --- | --- | --- | --- | --- | --- |
| one-basic | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN (3 APIs) |
| testflight | [PASS](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/testflight/install.log) | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN (10 APIs) |
| contrast-mobile | [PASS](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/contrast-mobile/install.log) | [FAIL](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/contrast-mobile/web-build.log) | NOT RUN | NOT RUN | NOT RUN | NOT RUN (43 APIs) |
| takeout-free | [PASS](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/takeout-free/install.log) | [PASS](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/takeout-free/web-build.log) | [FAIL](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/takeout-free/web-server.log) | NOT RUN | NOT RUN | no native API imports |

## sources and native APIs

### one-basic

Source: `/Users/n8/one/examples/one-basic`, revision `8172a63f49aca02146080a89b673a894b81855bd`.

| imported API | source locations | exercised evidence |
| --- | --- | --- |
| One.iOS.LiveActivities | `app/widget-demo.native.tsx:88`, `app/widget-demo.native.tsx:102`, `app/widget-demo.native.tsx:115`, `app/widget-demo.native.tsx:125`, `app/widget-demo.native.tsx:144`, `app/widget-demo.native.tsx:162` | NOT RUN |
| One.iOS.WidgetUI | `app/widget-demo.native.tsx:5` | NOT RUN |
| One.iOS.Widgets | `app/widget-demo.native.tsx:48`, `app/widget-demo.native.tsx:61` | NOT RUN |
### testflight

Source: `/Users/n8/one/examples/testflight`, revision `8172a63f49aca02146080a89b673a894b81855bd`.

| imported API | source locations | exercised evidence |
| --- | --- | --- |
| One.Haptics | `app/native/index.native.tsx:82`, `app/native/index.native.tsx:94`, `app/native/index.native.tsx:106` | NOT RUN |
| One.UI.SafeArea | `app/stack-toolbar/_layout.tsx:13`, `app/stack-toolbar/_layout.tsx:34`, `app/notifications/index+spa.tsx:26` | NOT RUN |
| One.iOS.Color | `app/native/index.native.tsx:70` | NOT RUN |
| One.iOS.MenuAction | `app/native/index.native.tsx:139`, `app/native/index.native.tsx:152`, `app/native/index.native.tsx:146` | NOT RUN |
| One.iOS.SplitView | `code/home/NativeSplitView.tsx:17`, `code/home/NativeSplitView.tsx:40`, `code/home/NativeSplitView.tsx:18`, `code/home/NativeSplitView.tsx:39` | NOT RUN |
| One.iOS.ToolbarHost | `app/native/index.native.tsx:130`, `app/native/index.native.tsx:153` | NOT RUN |
| One.iOS.ToolbarItem | `app/native/index.native.tsx:131`, `app/native/index.native.tsx:138` | NOT RUN |
| One.iOS.ZoomTransitionEnabler | `app/native/index.native.tsx:163` | NOT RUN |
| One.iOS.ZoomTransitionSource | `app/native/index.native.tsx:113`, `app/native/index.native.tsx:122` | NOT RUN |
| useSafeAreaInsets | `app/stack-toolbar/index.native.tsx:1` | NOT RUN |
### contrast-mobile

Source: `/Users/n8/contrast/templates/contrast-mobile`, revision `bb99c4270d34076033996fa7c7fcbeb0865211b5`.

| imported API | source locations | exercised evidence |
| --- | --- | --- |
| One.Android.AlertDialog | `../../packages/contrast-ui/src/dialog/DialogConfirmHost.android.tsx:24` | NOT RUN |
| One.Android.ContextMenu | `../../packages/contrast-ui/src/menu/MenuImpl.android.tsx:28`, `../../packages/contrast-ui/src/menu/MenuImpl.android.tsx:34`, `../../packages/contrast-native/src/menu/oneMenuAdapter.tsx:293` | NOT RUN |
| One.Android.Menu | `../../packages/contrast-ui/src/menu/MenuImpl.android.tsx:14`, `../../packages/contrast-ui/src/menu/MenuImpl.android.tsx:21`, `../../packages/contrast-native/src/menu/oneMenuAdapter.tsx:291` | NOT RUN |
| One.AppInfo | `interface/chat/ReportContentDialog.tsx:33`, `interface/chat/ReportContentDialog.tsx:34`, `app/home/settings.tsx:192`, `app/home/settings.tsx:193`, `app/home/settings.tsx:194`, `features/feedback/FeedbackBinding.tsx:23`, `features/push/registerInstallation.ts:18`, `features/ota/otaUpdates.ts:257`, `features/ota/otaUpdates.ts:332`, `features/telemetry/posthog.native.ts:126`, `features/telemetry/posthog.native.ts:127`, `features/telemetry/posthog.native.ts:128` | NOT RUN |
| One.Browser | `app/auth/login-success.tsx:82`, `features/auth/ui/LoginPasskeyButton.tsx:53`, `features/auth/ui/LoginPasskeyButton.tsx:71`, `features/auth/ui/LoginGithubButton.tsx:61`, `features/auth/ui/LoginGithubButton.tsx:82`, `features/auth/ui/PasskeySettingsSection.tsx:100`, `features/auth/ui/PasskeySettingsSection.tsx:109`, `features/billing/UpgradeScreen.tsx:65`, `features/billing/UpgradeScreen.tsx:106` | NOT RUN |
| One.Clipboard | `interface/chat/ChatMessageRow.tsx:141`, `interface/chat/ChatMessageRow.tsx:432`, `interface/chat/ComposerAttachmentDialog.tsx:496`, `interface/production/IosDevBuildSheet.tsx:93`, `app/home/settings.tsx:204`, `app/home/_layout.tsx:40` | NOT RUN |
| One.DocumentPicker | `helpers/media/documentPicker.native.ts:5` | NOT RUN |
| One.Haptics | `interface/tabs/ProjectTabs.tsx:534`, `interface/tabs/screens/ProjectsTabScreen.tsx:222`, `interface/tabs/screens/ProjectsTabScreen.tsx:232`, `interface/tabs/screens/ProjectsTabScreen.tsx:503`, `interface/tabs/screens/DevelopTabScreen.tsx:162`, `interface/chat/ChatComposer.tsx:464`, `interface/chat/ChatComposer.tsx:467`, `interface/chat/ChatComposer.tsx:655`, `interface/chat/ChatComposer.tsx:701`, `interface/chat/ChatStagePane.tsx:103`, `interface/chat/ProjectChat.tsx:261`, `interface/chat/ChatQuestion.tsx:42`, `interface/chat/ChatQuestion.tsx:57`, `interface/plan/TaskDetailView.tsx:65`, `interface/plan/TaskDetailView.tsx:96`, `interface/plan/TaskDetailView.tsx:113`, `interface/plan/TaskDetailView.tsx:136`, `interface/plan/FactoryPausedNotice.tsx:78`, `interface/plan/PlanBoardIconBar.tsx:143`, `interface/plan/ParentProgressCard.tsx:189`, `interface/plan/PlanBoard.tsx:344`, `interface/stage/StageStripContent.tsx:96`, `interface/preview/WideWorkspace.native.tsx:245`, `interface/preview/PreviewTrack.tsx:107`, `interface/header/HeaderIconButton.tsx:47`, `interface/header/CenteredActionButton.tsx:38`, `app/home/settings.tsx:207`, `app/auth/login-success.tsx:102`, `app/auth/login-success.tsx:124`, `app/download/[token].tsx:176`, `app/download/[token].tsx:217`, `features/auth/ui/LoginAppleButton.tsx:80`, `features/auth/ui/LoginPasskeyButton.tsx:80`, `features/auth/ui/LoginGithubButton.tsx:105`, `features/auth/ui/PasskeySettingsSection.tsx:121`, `features/auth/ui/PasskeySettingsSection.tsx:184`, `features/diagnostics/recordIssue.native.ts:36`, `features/diagnostics/recordIssue.native.ts:65`, `features/onboarding/Onboarding.tsx:88`, `features/onboarding/Onboarding.tsx:96`, `features/onboarding/Onboarding.tsx:559`, `../../packages/contrast-native/src/feedback/FeedbackOverlay.tsx:141`, `../../packages/contrast-native/src/feedback/FeedbackOverlay.tsx:161`, `../../packages/contrast-native/src/feedback/FeedbackOverlay.tsx:212`, `../../packages/contrast-native/src/feedback/FeedbackOverlay.tsx:240`, `../../packages/contrast-native/src/feedback/FeedbackOverlay.tsx:245`, `../../packages/contrast-native/src/feedback/FeedbackOverlay.tsx:251`, `../../packages/contrast-native/src/feedback/FeedbackOverlay.tsx:260`, `../../packages/contrast-native/src/feedback/withFeedback.tsx:47` | NOT RUN |
| One.ImagePicker | `interface/chat/ComposerAttachmentDialog.tsx:338`, `interface/chat/ComposerAttachmentDialog.tsx:354`, `interface/chat/ComposerAttachmentDialog.tsx:368` | NOT RUN |
| One.LaunchScreen | `app/_layout.tsx:59`, `app/_layout.tsx:278` | NOT RUN |
| One.Notifications | `../../packages/contrast-notifications/src/index.native.ts:93`, `../../packages/contrast-notifications/src/index.native.ts:132`, `../../packages/contrast-notifications/src/index.native.ts:135`, `../../packages/contrast-notifications/src/index.native.ts:177`, `../../packages/contrast-notifications/src/index.native.ts:209`, `../../packages/contrast-notifications/src/index.native.ts:231`, `../../packages/contrast-notifications/src/index.native.ts:236`, `../../packages/contrast-notifications/src/index.native.ts:237`, `../../packages/contrast-notifications/src/index.native.ts:239` | NOT RUN |
| One.SecureStore | `auth/platformClient.native.ts:18`, `auth/platformClient.native.ts:25`, `auth/platformClient.native.ts:30` | NOT RUN |
| One.Speech | `interface/chat/systemSpeechEngine.native.ts:15`, `interface/chat/systemSpeechEngine.native.ts:83`, `interface/chat/systemSpeechEngine.native.ts:113` | NOT RUN |
| One.Storage | `features/storage/setupStorage.ts:7`, `features/telemetry/posthog.native.ts:19`, `features/telemetry/posthog.native.ts:20`, `features/telemetry/posthog.native.ts:21` | NOT RUN |
| One.UI.Blur | `interface/effects/BlurView/BlurView.native.tsx:6`, `../../packages/contrast-native/src/feedback/FeedbackGlass.tsx:30`, `../../packages/contrast-native/src/feedback/FeedbackHalo.tsx:56`, `../../packages/contrast-ui/src/glass/GlassViewImpl.android.tsx:30`, `../../packages/contrast-ui/src/toast/ToastSurfaceImpl.android.tsx:23` | NOT RUN |
| One.UI.EdgeFade | `../../packages/contrast-internal-ui/src/scroll/FadedContent.tsx:297`, `../../packages/contrast-internal-ui/src/scroll/FadedContent.tsx:340` | NOT RUN |
| One.UI.Fonts | `features/fonts/loadAppFonts.ts:31` | NOT RUN |
| One.UI.Image | `interface/image/Image.native.tsx:4` | NOT RUN |
| One.UI.Mask | `interface/design/DesignScreenNav.tsx:54`, `interface/design/DesignScreenNav.tsx:87`, `interface/chat/ProjectChat.tsx:444`, `interface/chat/ProjectChat.tsx:459`, `interface/chat/ProjectChat.tsx:669`, `interface/chat/ProjectChat.tsx:686`, `interface/stage/StageGuysRow.tsx:197`, `interface/stage/StageGuysRow.tsx:251`, `interface/preview/PreviewStage.tsx:1692`, `interface/preview/PreviewStage.tsx:1798`, `interface/effects/GradientBlurView.tsx:93`, `interface/effects/GradientBlurView.tsx:111`, `features/onboarding/Onboarding.tsx:474`, `features/onboarding/Onboarding.tsx:491`, `../../packages/contrast-native/src/feedback/FeedbackHalo.tsx:30`, `../../packages/contrast-native/src/feedback/FeedbackHalo.tsx:67` | NOT RUN |
| One.UI.Pager | `interface/tabs/screens/DevelopTabScreen.tsx:223`, `interface/tabs/screens/DevelopTabScreen.tsx:245` | NOT RUN |
| One.UI.Portal | `interface/design/NativeDesignMap.native.tsx:3259`, `interface/design/NativeDesignMap.native.tsx:3291`, `interface/design/NativeDesignMap.native.tsx:3295`, `interface/design/NativeDesignMap.native.tsx:3309`, `interface/design/NativeDesignMap.native.tsx:3312`, `interface/design/NativeDesignMap.native.tsx:3319`, `interface/design/NativeDesignMap.native.tsx:3328`, `interface/design/NativeDesignMap.native.tsx:3341`, `interface/inspect/InspectFloatingControl.tsx:632`, `interface/inspect/InspectFloatingControl.tsx:711` | NOT RUN |
| One.UI.PortalHost | `interface/design/NativeDesignMap.native.tsx:3344` | NOT RUN |
| One.UI.ReservedRegions | `interface/preview/WideWorkspace.native.tsx:1232`, `interface/preview/WideWorkspace.native.tsx:1234` | NOT RUN |
| One.UI.SafeArea | `interface/tabs/ProjectTabs.tsx:1710`, `interface/tabs/ProjectTabs.tsx:1712`, `app/home/stage-preview.tsx:52`, `app/home/stage-preview.tsx:154`, `app/home/plan-stage-preview.tsx:72`, `app/home/plan-stage-preview.tsx:147`, `app/home/_layout.tsx:48`, `app/home/_layout.tsx:93`, `../../packages/contrast-native/src/feedback/withFeedback.tsx:60`, `../../packages/contrast-native/src/feedback/withFeedback.tsx:73` | NOT RUN |
| One.Updates | `features/diagnostics/recordIssue.native.ts:56`, `features/diagnostics/recordIssue.native.ts:57`, `features/ota/otaUpdates.ts:56`, `features/ota/otaUpdates.ts:65`, `features/ota/otaUpdates.ts:66`, `features/ota/otaUpdates.ts:67`, `features/ota/otaUpdates.ts:149`, `features/ota/otaUpdates.ts:171`, `features/ota/otaUpdates.ts:258`, `features/ota/otaUpdates.ts:331`, `features/ota/otaUpdates.ts:333`, `features/ota/otaUpdates.ts:355`, `features/ota/otaUpdates.ts:357`, `features/ota/otaUpdates.ts:366`, `features/ota/otaUpdates.ts:367`, `features/ota/otaUpdates.ts:368`, `features/ota/otaUpdates.ts:369`, `features/ota/appRestart.native.ts:9`, `features/ota/appRestart.native.ts:10` | NOT RUN |
| One.iOS.Alert | `../../packages/contrast-ui/src/dialog/DialogConfirmHost.ios.tsx:23` | NOT RUN |
| One.iOS.ArrangementView | `interface/tabs/ProjectTabs.tsx:2153` | NOT RUN |
| One.iOS.Button | `interface/tabs/ProjectTabs.tsx:1795`, `interface/tabs/ProjectTabs.tsx:1805`, `interface/tabs/ProjectTabs.tsx:1807`, `interface/tabs/ProjectTabs.tsx:1812`, `interface/tabs/ProjectTabs.tsx:1814`, `interface/tabs/ProjectTabs.tsx:1825`, `interface/tabs/ProjectTabs.tsx:1841`, `interface/tabs/ProjectTabs.tsx:1847`, `interface/tabs/ProjectTabs.tsx:1853`, `interface/tabs/ProjectTabs.tsx:1862`, `interface/tabs/ProjectTabs.tsx:1873`, `interface/preview/PreviewPanel.tsx:317` | NOT RUN |
| One.iOS.ContextMenu | `../../packages/contrast-ui/src/menu/MenuImpl.ios.tsx:27`, `../../packages/contrast-ui/src/menu/MenuImpl.ios.tsx:33`, `../../packages/contrast-native/src/menu/oneMenuAdapter.tsx:293` | NOT RUN |
| One.iOS.Glass | `interface/effects/Glass/Glass.tsx:45`, `../../packages/contrast-internal-ui/src/buttons/GlassButtonImpl.ios.tsx:25`, `../../packages/contrast-native/src/feedback/FeedbackGlass.tsx:20`, `../../packages/contrast-ui/src/glass/GlassViewImpl.ios.tsx:20`, `../../packages/contrast-ui/src/toast/ToastSurfaceImpl.ios.tsx:21` | NOT RUN |
| One.iOS.Image | `interface/tabs/ProjectTabs.tsx:1800`, `interface/tabs/ProjectTabs.tsx:1811`, `interface/preview/WideWorkspace.native.tsx:1225`, `../../packages/contrast-ui/src/icons/sfSymbol.tsx:37` | NOT RUN |
| One.iOS.Menu | `../../packages/contrast-ui/src/menu/MenuImpl.ios.tsx:13`, `../../packages/contrast-ui/src/menu/MenuImpl.ios.tsx:20`, `../../packages/contrast-native/src/menu/oneMenuAdapter.tsx:291` | NOT RUN |
| One.iOS.SignInWithAppleButton | `features/auth/ui/LoginAppleButton.tsx:99` | NOT RUN |
| One.iOS.Tab | `interface/tabs/ProjectTabs.tsx:1732`, `interface/tabs/ProjectTabs.tsx:1743`, `interface/tabs/ProjectTabs.tsx:1745`, `interface/tabs/ProjectTabs.tsx:1753`, `interface/tabs/ProjectTabs.tsx:1764`, `interface/tabs/ProjectTabs.tsx:1766`, `interface/tabs/ProjectTabs.tsx:1777`, `interface/tabs/ProjectTabs.tsx:1779` | NOT RUN |
| One.iOS.Tabs | `interface/tabs/ProjectTabs.tsx:1720`, `interface/tabs/ProjectTabs.tsx:1889` | NOT RUN |
| One.iOS.Text | `../../packages/contrast-ui/src/action-row/ActionRowLabels.ios.tsx:13`, `../../packages/contrast-ui/src/action-row/ActionRowLabels.ios.tsx:19` | NOT RUN |
| One.iOS.Toolbar | `interface/tabs/ProjectTabs.tsx:1789`, `interface/tabs/ProjectTabs.tsx:1887` | NOT RUN |
| One.iOS.ToolbarItemGroup | `interface/tabs/ProjectTabs.tsx:1792`, `interface/tabs/ProjectTabs.tsx:1820`, `interface/tabs/ProjectTabs.tsx:1824`, `interface/tabs/ProjectTabs.tsx:1836`, `interface/tabs/ProjectTabs.tsx:1839`, `interface/tabs/ProjectTabs.tsx:1868`, `interface/tabs/ProjectTabs.tsx:1871`, `interface/tabs/ProjectTabs.tsx:1885` | NOT RUN |
| One.openSettings | `app/home/settings.tsx:113` | NOT RUN |
| One.openShare | `interface/chat/ComposerAttachmentDialog.tsx:449`, `interface/production/ProductionView.tsx:328`, `app/home/settings.tsx:252` | NOT RUN |
| One.openURL | `interface/tabs/ProjectTabs.tsx:813`, `interface/production/IosDevBuildSheet.tsx:84`, `interface/production/DeployDetail.tsx:93`, `app/home/settings.tsx:305`, `app/home/settings.tsx:419`, `app/home/settings.tsx:428`, `app/home/settings.tsx:432`, `features/auth/ui/LoginPasskeyButton.tsx:68`, `features/auth/ui/PasskeySettingsSection.tsx:106`, `features/preview/WebPreview.tsx:253`, `features/preview/ProductionPreview.tsx:91`, `features/ota/otaUpdates.ts:297`, `features/ota/otaUpdates.ts:308` | NOT RUN |
| useSafeAreaInsets | `interface/tabs/ProjectTabs.tsx:92`, `interface/tabs/screens/DevelopTabScreen.tsx:6`, `interface/design/NativeDesignMap.native.tsx:46`, `interface/inspect/InspectFloatingControl.tsx:25`, `interface/chat/LinearChatImage.native.tsx:3`, `interface/plan/TaskDetailView.tsx:18`, `interface/toast/AppToast.tsx:8`, `interface/dialogs/LiquidGlassDialogSheet.tsx:3`, `interface/stage/StageWorkspaceCard.tsx:4`, `app/home/settings.tsx:45`, `app/home/[projectId]/index.tsx:6`, `app/home/[projectId]/task/[taskId].tsx:6`, `app/home/[projectId]/production/deploy/[deploymentId]/index.tsx:7`, `app/home/[projectId]/production/deploy/[deploymentId]/build.tsx:5`, `app/home/[projectId]/production/deploy/[deploymentId]/live.tsx:3`, `app/auth/login.tsx:10`, `app/download/[token].tsx:13`, `features/diagnostics/RecordingBanner.tsx:9`, `features/notifications/NotificationsScreen.tsx:7`, `features/billing/UpgradeScreen.tsx:15`, `features/onboarding/Onboarding.tsx:12`, `../../packages/contrast-native/src/feedback/FeedbackOverlay.tsx:1`, `../../packages/contrast-ui/src/toast/Toast.tsx:1` | NOT RUN |
| useSizeClass | `interface/tabs/ProjectTabs.tsx:92`, `interface/toast/AppToast.tsx:8` | NOT RUN |
### takeout-free

Source: `/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/sources/takeout-free`, revision `5185738f3e913b7cf242f844afb8413bee92bc48`.

| imported API | source locations | exercised evidence |
| --- | --- | --- |

## per-platform packages still imported

RAN: parsed application source imports, excluding comments, type-only imports, tests and generated declarations. The inventory follows source imports into shared workspace code and includes platform variants; external package internals are excluded.

| app | package/subpath | importing files |
| --- | --- | --- |
| testflight | @react-navigation/core | `app/index,notifications,profile,action/_layout.tsx:1` |
| testflight | @react-navigation/native | `app/profile/index.tsx:2`, `app/index/index.tsx:1`, `app/notifications/index+spa.tsx:5` |
| testflight | @react-navigation/native-stack | `app/native/index.native.tsx:1` |
| contrast-mobile | @callstack/liquid-glass | `features/preview/nativeBundleModules.ts:114` |
| contrast-mobile | @react-native/js-polyfills/console | `helpers/nativeThemeCheck.ts:50` |
| contrast-mobile | @react-navigation/bottom-tabs | `features/preview/nativeBundleModules.ts:115` |
| contrast-mobile | @react-navigation/core | `features/preview/nativeBundleModules.ts:116` |
| contrast-mobile | @react-navigation/native | `features/preview/nativeBundleModules.ts:117` |
| contrast-mobile | @react-navigation/native-stack | `features/preview/nativeBundleModules.ts:118` |
| contrast-mobile | @react-navigation/routers | `features/preview/nativeBundleModules.ts:119` |
| contrast-mobile | @shopify/react-native-skia | `interface/design/skiaFrozenTreeRenderer.ts:1`, `interface/design/NativeDesignMap.native.tsx:18`, `interface/design/skiaLiquidGlass.ts:19`, `interface/preview/NativeEnginePreviewPoc.tsx:3` |
| contrast-mobile | react-native-gesture-handler | `interface/tabs/ProjectTabs.tsx:104`, `interface/design/NativeDesignMap.native.tsx:64`, `interface/design/DesignScreenNav.tsx:6`, `interface/inspect/InspectFloatingControl.tsx:44`, `interface/chat/ChatComposer.tsx:67`, `interface/platform/PlatformSpecificRootProvider.native.tsx:1`, `interface/preview/PreviewPanel.tsx:19`, `interface/preview/useFloatingDock.ts:2`, `interface/preview/PreviewStage.tsx:44`, `interface/preview/TabPipSurface.tsx:4`, `interface/preview/WideWorkspace.native.tsx:15`, `interface/preview/PreviewTrack.tsx:3`, `interface/preview/NativeEnginePreviewPoc.tsx:6`, `app/_layout.tsx:41`, `features/preview/nativeBundleModules.ts:107`, `features/preview/NativeRunnerRoot.tsx:9` |
| contrast-mobile | react-native-keyboard-controller | `interface/tabs/tabPageKeyboard.ts:2`, `interface/design/NativeDesignMap.native.tsx:65`, `interface/design/DesignVariantsControls.tsx:10`, `interface/chat/ChatThread.tsx:15`, `interface/chat/ChatComposer.tsx:68`, `interface/chat/ProjectChat.tsx:45`, `interface/stage/StageWorkspaceCard.tsx:7`, `interface/preview/PreviewStage.tsx:45`, `interface/preview/TabPipSurface.tsx:5`, `interface/keyboard/dismissKeyboard.ts:2`, `app/auth/login.tsx:12`, `app/_layout.tsx:42`, `features/preview/nativeBundleModules.ts:113` |
| contrast-mobile | react-native-nitro-modules | `interface/preview/SootSimPreviewHost.tsx:43`, `features/diagnostics/cameraCatalog.native.ts:2`, `features/diagnostics/glassHealth.native.ts:2`, `features/preview/nativePreviewDiagnostics.native.ts:1`, `modules/peach-preview/index.ts:1`, `modules/native-engine-bridge/src/NativeEngineBridge.ts:1` |
| contrast-mobile | react-native-reanimated | `interface/tabs/ProjectTabs.tsx:105`, `interface/tabs/screens/ProjectsTabScreen.tsx:33`, `interface/tabs/tabPageKeyboard.ts:3`, `interface/design/NativeDesignMap.native.tsx:69`, `interface/design/DesignScreenNav.tsx:7`, `interface/inspect/InspectFloatingControl.tsx:45`, `interface/chat/ReadOnlyAgentChat.tsx:4`, `interface/chat/ChatThread.tsx:19`, `interface/chat/ChatComposer.tsx:69`, `interface/chat/ProjectChat.tsx:49`, `interface/chat/PulsingDots.tsx:2`, `interface/chat/ComposerConnectionIndicator.tsx:4`, `interface/plan/PlanBoardIconBar.tsx:13`, `interface/plan/ParentProgressCard.tsx:17`, `interface/production/ProductionView.tsx:14`, `interface/stage/StageSpeechBubble.tsx:11`, `interface/stage/StageGuysRow.tsx:16`, `interface/stage/StageWorkspaceCard.tsx:8`, `interface/stage/StagePresenceStack.tsx:4`, `interface/preview/PreviewPanel.tsx:20`, `interface/preview/useFloatingDock.ts:3`, `interface/preview/PreviewStage.tsx:46`, `interface/preview/TabPipSurface.tsx:6`, `interface/preview/WideWorkspace.native.tsx:16`, `interface/preview/PreviewTrack.tsx:4`, `interface/preview/DeviceFrame.tsx:8`, `interface/preview/NativeEnginePreviewPoc.tsx:7`, `interface/contrast/AnimatedContrastMark.tsx:5`, `interface/effects/glassAppear.ts:1`, `interface/header/ProjectHeader.tsx:11`, `app/home/plan-stage-preview.tsx:12`, `app/auth/login.tsx:13`, `features/preview/nativeBundleModules.ts:109`, `features/onboarding/Onboarding.tsx:21`, `features/conformance/ConformanceFrameSampler.tsx:3`, `../../packages/contrast-ui/src/lists/VirtualList.tsx:12`, `../../packages/contrast-ui/src/lists/VirtualRow.native.tsx:3` |
| contrast-mobile | react-native-safe-area-context | `features/preview/nativeBundleModules.ts:106` |
| contrast-mobile | react-native-screens | `features/preview/nativeBundleModules.ts:108` |
| contrast-mobile | react-native-svg | `interface/design/DesignScreenNav.tsx:16`, `interface/chat/ComposerConnectionIndicator.tsx:12`, `interface/plan/stage/PlanDocIcon.tsx:2`, `interface/contrast/ContrastMark.tsx:12`, `interface/contrast/ContrastFigure.tsx:2`, `interface/contrast/AnimatedContrastMark.tsx:13`, `interface/contrast/Lux.tsx:2`, `interface/header/ProjectHeader.tsx:16`, `features/preview/nativeBundleModules.ts:110`, `../../packages/contrast-internal-ui/src/icons/phosphor/MagnifyingGlassMinusIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/MagnifyingGlassPlusIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/MoonIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PencilSimpleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/StackIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/SunDimIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/SunIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ChatCircleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PlusIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/RabbitIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PaperPlaneTiltIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ArrowLeftIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/DotsThreeVerticalIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ArrowUpIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CrosshairIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/MicrophoneIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GitBranchIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CameraIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CopyIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FileIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ImageIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ShareNetworkIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/UserPlusIcon.tsx:3`, `../../src/features/chat/FactoryModelBadge.tsx:1`, `../../packages/contrast-internal-ui/src/icons/phosphor/CheckCircleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/EyeIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/HammerIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CaretLeftIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ScrollIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CloudArrowUpIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/DeviceMobileIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GlobeIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ArrowSquareOutIcon.tsx:3`, `../../packages/contrast-internal-ui/src/brand/AppleLogo.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/LockKeyIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/UsersIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ArrowsClockwiseIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/TrashIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ClipboardTextIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/KeyIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ClipboardIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GlobeSimpleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/BellIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/SparkleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CloudIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CodeIcon.tsx:3`, `../../packages/contrast-ui/src/icons/phosphor/CaretRightIcon.tsx:2`, `../../packages/contrast-ui/src/icons/phosphor/CaretDownIcon.tsx:2`, `../../packages/contrast-internal-ui/src/icons/phosphor/TimesIcon.tsx:3`, `../../packages/contrast-ui/src/icons/XIcon.tsx:2`, `../../packages/contrast-internal-ui/src/icons/phosphor/ArrowUUpLeftIcon.tsx:3`, `../../packages/contrast-ui/src/icons/phosphor/CheckIcon.tsx:2`, `../../packages/contrast-internal-ui/src/icons/phosphor/PauseIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/WarningIcon.tsx:3`, `../../packages/contrast-internal-ui/src/brand/ContrastLogo.tsx:9`, `../../packages/contrast-internal-ui/src/brand/PeachLogo.tsx:9`, `../../packages/contrast-internal-ui/src/icons/CloudflareIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/ContrastShellIcons.tsx:3`, `../../packages/contrast-internal-ui/src/icons/FollowCheckIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/GithubMarkIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/XLogoIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/AngleLeftIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/AngleRightIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ArrowRightIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ArrowUpRightIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ArrowsOutSimpleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/AtomIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/BarsIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/BookOpenIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/BrowsersIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/BugIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/BulletListIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CheckCircleFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ChevronDownIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CloudUploadIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CpuIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/DatabaseIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/DownloadAltIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/DownloadIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/EllipsesHorizontalIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/EllipsesVerticalIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/EnvelopeSimpleFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ExpandIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ExternalLinkIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/EyeFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FactoryFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FactoryIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FileCodeIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FilesIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FloppyDiskIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FolderIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FootprintsIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FunnelIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GameControllerIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GearSixIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GitForkIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GitPullRequestIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GithubLogoIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/HistoryIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/HomeIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/HourglassIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/HouseLineIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ImagePlusIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/InfoIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/KanbanFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/KanbanIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/LayoutGridIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/LayoutListIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/LightbulbIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/LightningIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/LockIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/MagnifyingGlassIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/MessageCircleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/MinusIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/MonitorIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/OctagonTimesFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/OctagonTimesIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PaletteFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PaletteIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PhoneRingingHighIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PictureInPictureIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PlaneIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PlayIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PuzzlePieceIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/QuestionIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/RecordIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/RefreshIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/RobotIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/RocketFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/RocketIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/RocketLaunchFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/RocketLaunchIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/SearchIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/StackFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/SteeringWheelIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/StorefrontIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/TableIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/TerminalWindowIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/TextTIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/UploadIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/UserIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/UsersRoundIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/WarningCircleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/WindowCloseIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/XCircleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ActivityIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ArmchairIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CalendarBlankIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CalendarDotsIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CarIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ChatCircleFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ChecksIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CircleDashedIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CircleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CircleNotchIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ClockIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CloudUploadFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CodeFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/CrownIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/EnvelopeSimpleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FileTextIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/FilmStripIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ForkKnifeIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GasPumpIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GiftIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/GlobeFillIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/HouseIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/InfoCircleIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/KeyboardIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/LampIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ListChecksIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ListIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/LockOpenIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/MapPinIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/MapTrifoldIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PathIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/PiggyBankIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ReceiptIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ShoppingBagIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/ShoppingCartIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/SignOutIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/TargetIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/TextAlignCenterIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/TextAlignLeftIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/TextAlignRightIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/TreeIcon.tsx:3`, `../../packages/contrast-internal-ui/src/icons/phosphor/WalletIcon.tsx:3`, `../../packages/contrast-native/src/feedback/FeedbackOverlay.tsx:17`, `../../packages/contrast-ui/src/icons/phosphor/CaretUpIcon.tsx:2`, `../../packages/contrast-native/src/feedback/FeedbackHalo.tsx:3`, `../../packages/contrast-native/src/feedback/FeedbackIcons.tsx:1` |
| contrast-mobile | react-native-svg/filter-image | `interface/icons/base.ts:6` |
| contrast-mobile | react-native-teleport | `features/preview/nativeBundleModules.ts:111` |
| contrast-mobile | react-native-url-polyfill/auto | `setupNative.ts:9` |
| contrast-mobile | react-native-webview | `interface/preview/SootSimPreviewHost.tsx:44`, `features/preview/nativeBundleModules.ts:112`, `features/preview/WebPreview.tsx:35`, `features/preview/ProductionPreview.tsx:13` |
| takeout-free | expo-crypto | `src/helpers/crypto/polyfill.native.ts:30` |
| takeout-free | expo-splash-screen | `src/interface/platform/PlatformSpecificRootProvider.native.tsx:1` |
| takeout-free | react-native-gesture-handler | `src/interface/platform/PlatformSpecificRootProvider.native.tsx:3`, `src/interface/toast/Toast.native.tsx:4` |
| takeout-free | react-native-keyboard-controller | `src/interface/platform/PlatformSpecificRootProvider.native.tsx:4`, `src/interface/keyboard/KeyboardStickyFooter.native.tsx:1` |
| takeout-free | react-native-mmkv | `src/features/storage/setupStorage.native.ts:2` |
| takeout-free | react-native-reanimated | `src/interface/toast/Toast.native.tsx:9` |
| takeout-free | react-native-safe-area-context | `app/(app)/home/(tabs)/feed/index.tsx:2`, `app/(app)/auth/signup/[method].tsx:3`, `app/_layout.tsx:4`, `src/interface/toast/Toast.native.tsx:17`, `src/interface/backgrounds/GradientBackground.tsx:3`, `src/interface/keyboard/KeyboardStickyFooter.native.tsx:2` |
| takeout-free | react-native-svg | `src/interface/app/LogoIcon.tsx:1`, `src/interface/icons/phosphor/CaretLeftIcon.tsx:1`, `src/interface/icons/phosphor/GearIcon.tsx:1`, `src/interface/icons/phosphor/UserCircleIcon.tsx:1`, `src/interface/icons/phosphor/CaretRightIcon.tsx:1`, `src/interface/icons/phosphor/DoorIcon.tsx:1`, `src/interface/icons/phosphor/PasswordIcon.tsx:1`, `src/interface/icons/phosphor/ArrowUpRightIcon.tsx:1`, `src/interface/icons/phosphor/SunIcon.tsx:1`, `src/interface/icons/phosphor/ListIcon.tsx:1`, `src/interface/icons/phosphor/MoonStarsIcon.tsx:1`, `src/interface/icons/phosphor/HouseIcon.tsx:1`, `src/interface/icons/phosphor/UserIcon.tsx:1`, `src/interface/icons/phosphor/CircleHalfIcon.tsx:1`, `src/interface/icons/AppleIcon.tsx:1`, `src/interface/icons/GoogleIcon.tsx:1` |
| takeout-free | react-native-worklets | `src/interface/toast/Toast.native.tsx:18` |

## failure output

### testflight: navigation-versions

[complete output](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/testflight/navigation-versions.log)

```text
t-navigation/core",
      "version": "8.0.0-alpha.40",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/@react-navigation/core/package.json",
      "expected": "8.0.0-alpha.34"
    },
    {
      "name": "@react-navigation/elements",
      "version": "3.0.0-alpha.54",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/@react-navigation/elements/package.json",
      "expected": "3.0.0-alpha.48"
    },
    {
      "name": "@react-navigation/native",
      "version": "8.0.0-alpha.50",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/@react-navigation/native/package.json",
      "expected": "8.0.0-alpha.44"
    },
    {
      "name": "@react-navigation/elements",
      "version": "3.0.0-alpha.54",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/@react-navigation/elements/package.json",
      "expected": "3.0.0-alpha.48"
    },
    {
      "name": "@react-navigation/native",
      "version": "8.0.0-alpha.50",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/@react-navigation/native/package.json",
      "expected": "8.0.0-alpha.44"
    },
    {
      "name": "@react-navigation/native",
      "version": "8.0.0-alpha.50",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/@react-navigation/native/package.json",
      "expected": "8.0.0-alpha.44"
    },
    {
      "name": "@react-navigation/elements",
      "version": "3.0.0-alpha.54",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/one/node_modules/@react-navigation/native-stack/node_modules/@react-navigation/elements/package.json",
      "expected": "3.0.0-alpha.48"
    },
    {
      "name": "@react-navigation/native",
      "version": "8.0.0-alpha.50",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/@react-navigation/native/package.json",
      "expected": "8.0.0-alpha.44"
    },
    {
      "name": "@react-navigation/routers",
      "version": "8.0.0-alpha.20",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/@react-navigation/core/node_modules/@react-navigation/routers/package.json",
      "expected": "8.0.0-alpha.17"
    },
    {
      "name": "@react-navigation/native",
      "version": "8.0.0-alpha.50",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/@react-navigation/native/package.json",
      "expected": "8.0.0-alpha.44"
    },
    {
      "name": "@react-navigation/native",
      "version": "8.0.0-alpha.50",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/testflight/node_modules/@react-navigation/native/package.json",
      "expected": "8.0.0-alpha.44"
    }
  ],
  "failures": [
    "example-testflight resolves @react-navigation/native@8.0.0-alpha.50; One was tested with 8.0.0-alpha.44",
    "example-testflight resolves @react-navigation/native-stack@8.0.0-alpha.58; One was tested with 8.0.0-alpha.52",
    "one resolves @react-navigation/core@8.0.0-alpha.40; One was tested with 8.0.0-alpha.34",
    "one resolves @react-navigation/native@8.0.0-alpha.50; One was tested with 8.0.0-alpha.44",
    "@react-navigation/native resolves @react-navigation/core@8.0.0-alpha.40; One was tested with 8.0.0-alpha.34",
    "@react-navigation/native-stack resolves @react-navigation/elements@3.0.0-alpha.54; One was tested with 3.0.0-alpha.48",
    "@react-navigation/native-stack resolves @react-navigation/native@8.0.0-alpha.50; One was tested with 8.0.0-alpha.44",
    "@react-navigation/bottom-tabs resolves @react-navigation/elements@3.0.0-alpha.54; One was tested with 3.0.0-alpha.48",
    "@react-navigation/bottom-tabs resolves @react-navigation/native@8.0.0-alpha.50; One was tested with 8.0.0-alpha.44",
    "@react-navigation/elements resolves @react-navigation/native@8.0.0-alpha.50; One was tested with 8.0.0-alpha.44",
    "@react-navigation/native-stack resolves @react-navigation/elements@3.0.0-alpha.54; One was tested with 3.0.0-alpha.48",
    "@react-navigation/native-stack resolves @react-navigation/native@8.0.0-alpha.50; One was tested with 8.0.0-alpha.44",
    "@react-navigation/core resolves @react-navigation/routers@8.0.0-alpha.20; One was tested with 8.0.0-alpha.17",
    "@react-navigation/elements resolves @react-navigation/native@8.0.0-alpha.50; One was tested with 8.0.0-alpha.44",
    "@react-navigation/elements resolves @react-navigation/native@8.0.0-alpha.50; One was tested with 8.0.0-alpha.44"
  ]
}

```

### contrast-mobile: web-build

[complete output](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/contrast-mobile/web-build.log)

```text
49mr[0m[38;5;249me[0m[38;5;249ma[0m[38;5;249mt[0m[38;5;249me[0m[38;5;249m [0m[38;5;249m=[0m[38;5;249m [0m[38;5;249mO[0m[38;5;249mb[0m[38;5;249mj[0m[38;5;249me[0m[38;5;249mc[0m[38;5;249mt[0m[38;5;249m.[0m[38;5;249mc[0m[38;5;249mr[0m[38;5;249me[0m[38;5;249ma[0m[38;5;249mt[0m[38;5;249me[0m[38;5;249m;[0m
 [38;5;240m  │[0m ───┬──  
 [38;5;240m  │[0m    ╰──── 
[38;5;246m───╯[0m

  at aggregateBindingErrorsIntoJsError (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/rolldown/dist/shared/error-NcRuXAVN.mjs:48:18)
  at unwrapBindingResult (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/rolldown/dist/shared/error-NcRuXAVN.mjs:18:128)
  at #build (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/rolldown/dist/shared/rolldown-vcii7mEa.mjs:132:34)
  at async buildEnvironment (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/vite/dist/node/chunks/node.js:33821:66)
  at async Object.build (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/vite/dist/node/chunks/node.js:34242:19)
  at async Promise.all (index 0)
  at async build (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/vxrn/dist/exports/build.mjs:215:40)
  at async build (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/one/dist/esm/cli/build.mjs:162:21)
  at async Object.run (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/one/dist/esm/cli.mjs:129:3)
  at async runCommand (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/citty/dist/index.mjs:316:16)
  at async runCommand (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/citty/dist/index.mjs:307:11)
  at async runMain (/Users/n8/.worktrees/contrast-realapps-one-realapps-0ZOGpl/node_modules/citty/dist/index.mjs:445:7) 

[error] Build failed with 4 errors:

[31m[PARSE_ERROR] [0mCannot use import statement outside a module
   [38;5;246m╭[0m[38;5;246m─[0m[38;5;246m[[0m ../../node_modules/one/dist/cjs/createApp.cjs:1:1 [38;5;246m][0m
   [38;5;246m│[0m
 [38;5;246m1 │[0m var __[38;5;249mc[0m[38;5;249mr[0m[38;5;249me[0m[38;5;249ma[0m[38;5;249mt[0m[38;5;249me[0m[38;5;249m [0m[38;5;249m=[0m[38;5;249m [0m[38;5;249mO[0m[38;5;249mb[0m[38;5;249mj[0m[38;5;249me[0m[38;5;249mc[0m[38;5;249mt[0m[38;5;249m.[0m[38;5;249mc[0m[38;5;249mr[0m[38;5;249me[0m[38;5;249ma[0m[38;5;249mt[0m[38;5;249me[0m[38;5;249m;[0m
 [38;5;240m  │[0m ───┬──  
 [38;5;240m  │[0m    ╰──── 
[38;5;246m───╯[0m

[31m[PARSE_ERROR] [0mCannot use import statement outside a module
   [38;5;246m╭[0m[38;5;246m─[0m[38;5;246m[[0m ../../node_modules/one/dist/cjs/utils/dynamicImport.cjs:1:1 [38;5;246m][0m
   [38;5;246m│[0m
 [38;5;246m1 │[0m var __[38;5;249md[0m[38;5;249me[0m[38;5;249mf[0m[38;5;249mP[0m[38;5;249mr[0m[38;5;249mo[0m[38;5;249mp[0m[38;5;249m [0m[38;5;249m=[0m[38;5;249m [0m[38;5;249mO[0m[38;5;249mb[0m[38;5;249mj[0m[38;5;249me[0m[38;5;249mc[0m[38;5;249mt[0m[38;5;249m.[0m[38;5;249md[0m[38;5;249me[0m[38;5;249mf[0m[38;5;249mi[0m[38;5;249mn[0m[38;5;249me[0m[38;5;249mP[0m[38;5;249mr[0m[38;5;249mo[0m[38;5;249mp[0m[38;5;249me[0m[38;5;249mr[0m[38;5;249mt[0m[38;5;249my[0m[38;5;249m;[0m
 [38;5;240m  │[0m ───┬──  
 [38;5;240m  │[0m    ╰──── 
[38;5;246m───╯[0m

[31m[PARSE_ERROR] [0mCannot use import statement outside a module
   [38;5;246m╭[0m[38;5;246m─[0m[38;5;246m[[0m ../../node_modules/one/dist/cjs/router/hmrImport.cjs:1:1 [38;5;246m][0m
   [38;5;246m│[0m
 [38;5;246m1 │[0m var __[38;5;249md[0m[38;5;249me[0m[38;5;249mf[0m[38;5;249mP[0m[38;5;249mr[0m[38;5;249mo[0m[38;5;249mp[0m[38;5;249m [0m[38;5;249m=[0m[38;5;249m [0m[38;5;249mO[0m[38;5;249mb[0m[38;5;249mj[0m[38;5;249me[0m[38;5;249mc[0m[38;5;249mt[0m[38;5;249m.[0m[38;5;249md[0m[38;5;249me[0m[38;5;249mf[0m[38;5;249mi[0m[38;5;249mn[0m[38;5;249me[0m[38;5;249mP[0m[38;5;249mr[0m[38;5;249mo[0m[38;5;249mp[0m[38;5;249me[0m[38;5;249mr[0m[38;5;249mt[0m[38;5;249my[0m[38;5;249m;[0m
 [38;5;240m  │[0m ───┬──  
 [38;5;240m  │[0m    ╰──── 
[38;5;246m───╯[0m

[31m[PARSE_ERROR] [0mCannot use import statement outside a module
   [38;5;246m╭[0m[38;5;246m─[0m[38;5;246m[[0m ../../node_modules/one/dist/cjs/views/PreloadLinks.cjs:1:1 [38;5;246m][0m
   [38;5;246m│[0m
 [38;5;246m1 │[0m var __[38;5;249mc[0m[38;5;249mr[0m[38;5;249me[0m[38;5;249ma[0m[38;5;249mt[0m[38;5;249me[0m[38;5;249m [0m[38;5;249m=[0m[38;5;249m [0m[38;5;249mO[0m[38;5;249mb[0m[38;5;249mj[0m[38;5;249me[0m[38;5;249mc[0m[38;5;249mt[0m[38;5;249m.[0m[38;5;249mc[0m[38;5;249mr[0m[38;5;249me[0m[38;5;249ma[0m[38;5;249mt[0m[38;5;249me[0m[38;5;249m;[0m
 [38;5;240m  │[0m ───┬──  
 [38;5;240m  │[0m    ╰──── 
[38;5;246m───╯[0m


```

### takeout-free: navigation-versions

[complete output](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/takeout-free/navigation-versions.log)

```text
{
  "one": "2.0.0-beta.168.1",
  "expected": {
    "@react-navigation/core": "8.0.0-alpha.34",
    "@react-navigation/drawer": "8.0.0-alpha.51",
    "@react-navigation/native": "8.0.0-alpha.44",
    "@react-navigation/bottom-tabs": "8.0.0-alpha.50",
    "@react-navigation/elements": "3.0.0-alpha.48",
    "@react-navigation/native-stack": "8.0.0-alpha.52",
    "@react-navigation/routers": "8.0.0-alpha.17"
  },
  "graph": [
    {
      "name": "@react-navigation/bottom-tabs",
      "version": "8.0.0-alpha.50",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/bottom-tabs/package.json",
      "expected": "8.0.0-alpha.50"
    },
    {
      "name": "@react-navigation/elements",
      "version": "3.0.0-alpha.48",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/elements/package.json",
      "expected": "3.0.0-alpha.48"
    },
    {
      "name": "@react-navigation/native-stack",
      "version": "8.0.0-alpha.52",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/native-stack/package.json",
      "expected": "8.0.0-alpha.52"
    },
    {
      "name": "@react-navigation/routers",
      "version": "8.0.0-alpha.17",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/routers/package.json",
      "expected": "8.0.0-alpha.17"
    },
    {
      "name": "@react-navigation/core",
      "version": "7.17.2",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/core/package.json",
      "expected": "8.0.0-alpha.34"
    },
    {
      "name": "@react-navigation/native",
      "version": "7.2.2",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/native/package.json",
      "expected": "8.0.0-alpha.44"
    },
    {
      "name": "@react-navigation/elements",
      "version": "3.0.0-alpha.48",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/elements/package.json",
      "expected": "3.0.0-alpha.48"
    },
    {
      "name": "@react-navigation/native",
      "version": "7.2.2",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/native/package.json",
      "expected": "8.0.0-alpha.44"
    },
    {
      "name": "@react-navigation/native",
      "version": "7.2.2",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/native/package.json",
      "expected": "8.0.0-alpha.44"
    },
    {
      "name": "@react-navigation/elements",
      "version": "3.0.0-alpha.48",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/elements/package.json",
      "expected": "3.0.0-alpha.48"
    },
    {
      "name": "@react-navigation/native",
      "version": "7.2.2",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/native/package.json",
      "expected": "8.0.0-alpha.44"
    },
    {
      "name": "@react-navigation/routers",
      "version": "7.5.3",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/core/node_modules/@react-navigation/routers/package.json",
      "expected": "8.0.0-alpha.17"
    },
    {
      "name": "@react-navigation/core",
      "version": "7.17.2",
      "path": "/private/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/apps/takeout-free/node_modules/@react-navigation/core/package.json",
      "expected": "8.0.0-alpha.34"
    }
  ],
  "failures": [
    "one resolves @react-navigation/core@7.17.2; One was tested with 8.0.0-alpha.34",
    "one resolves @react-navigation/native@7.2.2; One was tested with 8.0.0-alpha.44",
    "@react-navigation/bottom-tabs resolves @react-navigation/native@7.2.2; One was tested with 8.0.0-alpha.44",
    "@react-navigation/elements resolves @react-navigation/native@7.2.2; One was tested with 8.0.0-alpha.44",
    "@react-navigation/native-stack resolves @react-navigation/native@7.2.2; One was tested with 8.0.0-alpha.44",
    "@react-navigation/core resolves @react-navigation/routers@7.5.3; One was tested with 8.0.0-alpha.17",
    "@react-navigation/native resolves @react-navigation/core@7.17.2; One was tested with 8.0.0-alpha.34"
  ]
}

```

### takeout-free: web-runtime

[complete output](/var/folders/yj/pjyw5xhx0378kfpr03q0tn_00000gn/T/one-realapps-0ZOGpl/takeout-free/web-server.log)

```text
Error
```

## rerun

```sh
bun tests/native-features/scripts/realapps.ts --version 2.0.0-beta.168.1 --ios-sim <iOS-27-UDID> --android <serial>
```

Use --phase inventory for the dependency/API list, or --phase web/ios/android for one platform. --run-dir resumes the same clean install for diagnosis; omit it for a new install. API coverage requires named evidence for every imported API on every applicable platform. Build success and HTTP success alone do not satisfy runtime coverage.

Android Pager return/draft and composer/IME proofs belong to p56058 (lane r54227); this runner does not duplicate those proofs.

## continued validation, 2026-10-03

RAN: routing repair `81558502b`, runner `548f0155f`, server initialization and Drawer dependency repair `be1f4db59`, Android selected-device repair `642966a92` landed on `v2-beta`. Starter navigation pins and gesture handler landed on `v2-beta-starter` (`3ff7a1fb9`, `bd6044cc3`).

RAN: the Basic clean canary web runtime passed (`/tmp/one-realapps-canary-web-runtime.log`), including `/tabs/profile`. The iOS 27.0 simulator repeated stack, tabs and drawer with count 0, increment to 1, navigate away, and return to count 1 (`/tmp/one-realapps-ios-routing-static-proof.log`, screenshots and receipt in `/tmp/one-realapps-ios-routing-static-proof`). This native receipt uses local source overlays, so it does not yet satisfy the final clean-install row.

RAN: Contrast web rebuilt 15 pages after the authorized preview platform boundary, iOS dock asset boundary and use of the existing EdgeFade mask API. Original onboarding and login render (`/tmp/one-realapps-contrast-web-runtime-edgefade.log`). The preview route redirects to onboarding without authentication; this does not prove an authenticated preview. Native builds and complete API coverage remain pending.

RAN: an incorrect local package build omitted One's existing staticSpecs post-build rewrite, producing a Pager export rejection and missing native view configs. The published canary already contains static view configs. Rebuilding through `bun run --cwd packages/one build` rewrote 100 specs and 500 mirrors and restored the iOS navigation proof. No compiler source fix was retained for this local validation mistake.

## continued device validation, 2026-10-04 UTC

The initial matrix above records the beta.168.1 negative run. Final clean-install
validation remains incomplete. The following passes are diagnostic evidence;
they use the artifacts and overlays stated here and do not turn that matrix green.

| app | current evidence | remaining final proof |
| --- | --- | --- |
| one-basic | RAN published canary web, including `/tabs/profile`; local-source-overlay web, iOS 27 and Android routing keep counter 1 after back | clean same-artifact native rebuild and Widgets/LiveActivities calls |
| takeout-free | RAN Expo 58 / RN 0.87 Android build and original `Login to Takeout`; earlier SDK 58 web build | iOS build/run, web after the helper/network update, rebuilt APK with Expo Network, same-artifact routing |
| contrast-mobile | RAN original onboarding on iOS 27 and Android; web onboarding/login; iOS UI and menus smoke; fresh iOS and Android service flows | remaining iOS/external APIs, Android UI/menus, authenticated native preview mount, final same-artifact native builds |
| testflight (optional fixture app) | RAN clean web build with TypeScript 5.9.3 | native toolbar uses the existing BarButtonItem API; native validation pending |

RAN: One repairs on `v2-beta` include `b2a371bde` (Expo CLI/logbox dependency
scanning), `48a455106` (Android EdgeFade constant-bound AGSL loop), `0ff4ea4e9`
(Expo Android host uses the app's DEBUG flag and index entry), `126de7e4c`
(Updates runtime version is a manifest string resource), `57f81cc31` and
`f503b90f9` (real-app API fixtures), `d6b24439e` (iOS Hermes request readiness),
and `85406ce56` (unobscured controls before taps and precise receipt scopes).
One main is untouched.

RAN: Expo host negative control used the generated Expo 58 host with the library's
DEBUG flag. Android looked for an asset bundle. The repaired host reached native
JavaScript, and the incremental Android build took 14 seconds. The next Hermes
failure was `new Intl.PluralRules` from the old `@o/helpers` barrel and then its
nested copy in `@o/better-auth-utils`. The already-published Orez native graph fix
was verified in tarball `0.16.19-canary.1791057120646`, source
`c8627257deb64eaa4ac3a1616ef471c8448a904b`. Updating the whole installed `@o`
family removed those two constructor failures. No Orez source change was retained.

RAN: the next native failure was an untransformed `import("expo-network")` in
`@better-auth/expo`. Its declared Expo Network peer was missing. Adding the SDK 58
matching package produced a 14,464,722 byte bundle and the original Android login
screen. The template dependency repair is saved as draft `45f0dca` on Takeout
Free's `tm/one-realapps`. The installed Android binary predates Network autolinking,
so this is not the final complete native build. Logs:
`/tmp/one-realapps-takeout-android-cold-pid-logcat.log`,
`/tmp/one-realapps-takeout-native-network-bundle.log`,
`/tmp/one-realapps-takeout-android-network-home.log`.

RAN: Contrast's claimed Air24 iOS 27 simulator is
`17E25DEE-3930-427F-8BD5-6EA840ED3E7C`. Original onboarding passed with
`Build everywhere, together.`. The current JS artifact is published One
`2.0.0-0.canary.1791075465610` from `fcd4558352f11bfa4d834ba89964d8251d4bf66f`;
the binary was built with an earlier local source overlay. Actual iOS Hermes
bytecode readiness returned 33,930,787 bytes and magic `c61fbc03c103191f`.
A plain-JavaScript warm request had left the iOS app waiting for its bytecode.
The runner now warms the exact iOS bytecode request.

RAN: `/tmp/one-realapps-contrast-ios-services-bytecode-stable/api-results.json`
retains passed AppInfo, Storage, SecureStore, Clipboard and Fonts plus observed
native Haptics dispatch, Speech availability/permission, Updates metadata and
LaunchScreen.hide. Notifications fails with `E_NOTIFICATIONS_SCHEDULE` and
`scheduling the notification failed` after the UI asserts permission granted.
The original negative receipt remains retained. The fresh-native follow-up below
passes scheduling and cancellation.

RAN: `/tmp/one-realapps-contrast-ios-ui-centered.log` and its retained captures
prove native Blur/Mask toggle dispatch, EdgeFade mount, Image load, Pager selection
and return callbacks, Portal touch through the named PortalHost, safe-area/size-class
metrics and ReservedRegions provider events. They do not prove adaptive rotation,
pixel parity, physical haptics, microphone transcription or live OTA fetching.
The first Pager-return failure capture placed the control under the fixed fixture
menu. Centering the control before tapping preserved the Page zero assertion and
made it pass. `/tmp/one-realapps-contrast-ios-menus-stable.log` proves native Menu,
ContextMenu and Alert selection callbacks. Android Pager return/draft and composer
IME deep proofs remain owned by p56058/r54227 and are not duplicated here.

RAN: next native compilation moved to CI64 after removing completed, writer-free
Android intermediates and old iOS intermediates on Studio, preserving APKs, app
bundles, source and captures. Studio free space rose from 78 to 89 GiB. CI64's
initial CocoaPods run failed under the remote shell's US-ASCII locale. Explicit
UTF-8 environment rerun installed 109 pods in 64 seconds. Builds continue through
`bun heavy`; no CoreSimulator service restart was used. Final template main merges,
release artifact validation and full green matrix are still pending.

RAN: CI64 compiled Contrast's clean-install published `fcd4558352` iOS artifact
in 491,376 ms. The installed app on Air24 reports version 1.0.1, build 3 and
Updates runtime 84. The service flow requests notification authorization through
the OS dialog and retains the scheduled identifier before canceling it; the
pending list is empty afterward. Full receipts:
`/tmp/one-realapps-contrast-ios-services-real-permission/api-results.json`.
Android service smoke also completed:
`/tmp/one-realapps-contrast-android-services-metadata-string/api-results.json`.
The Android binary is diagnostic and reports Updates disabled; final configured
metadata still requires the clean native rebuild.

RAN: LLDB inspected the original notification NSError: `UNErrorDomain`, code
2003, `Repository could not save notification. Source is not authorized.` and
`UNAuthorizationStatus: Denied`, while One's permission query returned granted.
INFERRED: persisted simulator authorization state was inconsistent. Both native
binary and installation changed before the positive proof, so this does not
isolate a framework cause. The same fresh binary also passes the former
Maestro `all: allow` control. That counterexample rejects the hypothesis that
Maestro's default permission setting alone caused the failure. No Notifications
source workaround was added.

RAN: Takeout Android stack, tabs and drawer keep count 1 after navigating away
and back: `/tmp/one-realapps-takeout-android-routing-header.log`. The earlier
fixed bottom fixture menu was occluded; placing the fixture menu above the app
with safe-area spacing fixes its taps. Product navigation was unchanged.

RAN: the Takeout iOS negative build failed at `@react-native-menu/menu@2.0.0`
with `RCTBridge.h file not found` under RN 0.87's prebuilt React headers.
The template now carries a Bun patch importing `<React/RCTBridge.h>`, matching
the other React imports in the same source. The next compilation passed that
file and failed at SVG 15.15.3's observer pointer signature. Published SVG
15.15.5 handles RN versions above 84 with the new shared pointer signature;
the template now pins that version. Incremental validation remains in progress.


## latest clean artifact and fixture repairs

RAN: fresh Basic on CI64 used exact `2.0.0-0.canary.1791082782289`:
install 6.42s, navigation graph 0.10s, production web build 55.67s, browser
runtime pass after installing the exact resolved Playwright browser. Runner
`7065fe408` now installs that matching browser before every web runtime check.

RAN: `bdaa7b83f` mounts the injected menu with the root Stack, preserving
app readiness gates, and waits on that menu before native route taps. The
cold-start Android negative capture had an empty shell. INFERRED from the root
layout readiness returns and the earlier menu wrapping those returns: a tap
could precede the app Stack. RAN: a fresh flow now enters the API route. One's
product navigation was unchanged by this fixture repair.

RAN: Android's native UI flow passes with exact page-one/page-zero and Portal
hit-1 assertions in `/tmp/one-realapps-contrast-android-ui-visible-actions`.
The diagnostic binary remains the earlier artifact/overlay described above.
The failed preceding flow's screenshot and hierarchy show Pager's action fully
visible at bounds [32,1660][1049,1764], while Maestro repeatedly attempted to
center it and timed out. The helper now requires full visibility and asserts the
id before tapping. Timeout and native callback assertions are unchanged.

RAN: Takeout draft `96d77b9` adds the RN 0.87 native header/Fabric Swift
compatibility patches and SVG 15.15.5, pins the same whole One artifact family,
and passes frozen Bun install. iOS compile negatives remain retained in
`/tmp/one-realapps-takeout-ci-ios-build-*.json`; final compile/run is pending.
The Swift importer removes the trailing View from the added Objective-C
property's name; the Swift call now uses its imported `reactFabricRootContent`.

RAN: Apple sign-in on the account-free simulator opens the system account
required dialog and forwards AuthorizationError 1000 after Close. This proves
native invocation and error forwarding, not credential sign-in. Native Glass
receives SwiftUI-compatible children; the fixture's former RN Text child was
invalid and has been removed. These receipts carry precise observed scopes.

RAN: small diagnostic API receipts are retained in
[the evidence directory](../tests/native-features/evidence/realapps/diagnostic/README.md),
with their binary/artifact limits. They do not replace final clean validation.


RAN: Basic's exact-a4 clean iOS build passed on CI64, no compiler errors.
The app bundle is `/tmp/one-realapps-basic-a4-app.zip`; it was installed on the
claimed Air24 standard iPhone17Pro27.0. Original UI, routing and Widgets calls
are the next checks, so build/install does not yet count as a runtime pass.

RAN: Contrast's new Pro64 worktree at branch `fix/realapps-native-pro`, source
`b94d9d49fe`, installed the exact-a4 family and passed the navigation graph.
Android prebuild generated Updates runtime84 as a string resource. The clean
native `assembleDebug` passed in13m40s,786 tasks executed, with no source
or installed-package overlays. Log `/tmp/one-realapps-contrast-pro-android-build.log`
on Pro64; APK transferred to Studio for the selected emulator. Native runtime
checks remain pending. Studio hosts only a forwarded port4400 for this server.

RAN: Takeout's Fabric Swift patch compiles past its earlier errors. The next
negative is bottom-tabs0.10.2's quoted `RCTConversions.h`. The framework
contains `React.framework/Headers/RCTConversions.h`; ImageManager's header
is exported under `react/renderer/imagemanager`. A narrow package patch uses
those actual qualified paths. No routing algorithm or tab behavior was changed.
