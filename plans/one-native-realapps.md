# One native real-app matrix

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
