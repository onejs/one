import type { ColorValue, ViewProps } from 'react-native';
import type * as Styles from './swiftui';
import type { KeyboardType, TextContentType } from '../textTypes';
import type { IconColorRole } from '../ui/iconRoles';
import type { NativeState } from '../syncNativeState';
export declare const glassEffects: readonly ['regular', 'clear', 'identity'];
export type GlassEffect = (typeof glassEffects)[number];
export declare const glassEffectShapes: readonly ['capsule', 'circle', 'containerRelativeShape', 'ellipse', 'rectangle', 'roundedRectangle'];
export type GlassEffectShape = (typeof glassEffectShapes)[number];
export declare const materials: readonly ['ultraThin', 'thin', 'regular', 'thick', 'ultraThick'];
export type Material = (typeof materials)[number];
export declare const sdkAccentColorValues: readonly ['accentColor', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'primary', 'secondary'];
export type SDKAccentColor = (typeof sdkAccentColorValues)[number];
export declare const sdkAccessibilityActivationPointValues: readonly ['zero', 'center', 'leading', 'trailing', 'top', 'bottom', 'topLeading', 'topTrailing', 'bottomLeading', 'bottomTrailing'];
export type SDKAccessibilityActivationPoint = (typeof sdkAccessibilityActivationPointValues)[number];
export declare const sdkAccessibilityAddTraitsValues: readonly ['isButton', 'isHeader', 'isSelected', 'isLink', 'isSearchField', 'isImage', 'playsSound', 'isKeyboardKey', 'isStaticText', 'isSummaryElement', 'updatesFrequently', 'startsMediaSession', 'allowsDirectInteraction', 'causesPageTurn', 'isModal', 'isToggle', 'isTabBar'];
export type SDKAccessibilityAddTraits = (typeof sdkAccessibilityAddTraitsValues)[number];
export declare const sdkAccessibilityElementValues: readonly ['ignore', 'contain', 'combine'];
export type SDKAccessibilityElement = (typeof sdkAccessibilityElementValues)[number];
export declare const sdkAccessibilityHeadingValues: readonly ['unspecified', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
export type SDKAccessibilityHeading = (typeof sdkAccessibilityHeadingValues)[number];
export declare const sdkAccessibilityRemoveTraitsValues: readonly ['isButton', 'isHeader', 'isSelected', 'isLink', 'isSearchField', 'isImage', 'playsSound', 'isKeyboardKey', 'isStaticText', 'isSummaryElement', 'updatesFrequently', 'startsMediaSession', 'allowsDirectInteraction', 'causesPageTurn', 'isModal', 'isToggle', 'isTabBar'];
export type SDKAccessibilityRemoveTraits = (typeof sdkAccessibilityRemoveTraitsValues)[number];
export declare const sdkAccessibilityTextContentTypeValues: readonly ['plain', 'console', 'fileSystem', 'messaging', 'narrative', 'sourceCode', 'spreadsheet', 'wordProcessing'];
export type SDKAccessibilityTextContentType = (typeof sdkAccessibilityTextContentTypeValues)[number];
export declare const sdkAddPassToWalletButtonStyleValues: readonly ['black', 'blackOutline'];
export type SDKAddPassToWalletButtonStyle = (typeof sdkAddPassToWalletButtonStyleValues)[number];
export declare const sdkAllowedDynamicRangeValues: readonly ['standard', 'constrainedHigh', 'high'];
export type SDKAllowedDynamicRange = (typeof sdkAllowedDynamicRangeValues)[number];
export declare const sdkAnimationValues: readonly ['default', 'interpolatingSpring', 'spring', 'interactiveSpring', 'smooth', 'snappy', 'bouncy', 'easeInOut', 'easeIn', 'easeOut', 'linear'];
export type SDKAnimation = (typeof sdkAnimationValues)[number];
export declare const sdkBadgeProminenceValues: readonly ['decreased', 'standard', 'increased'];
export type SDKBadgeProminence = (typeof sdkBadgeProminenceValues)[number];
export declare const sdkBlendModeValues: readonly ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'colorDodge', 'colorBurn', 'softLight', 'hardLight', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'sourceAtop', 'destinationOver', 'destinationOut', 'plusDarker', 'plusLighter'];
export type SDKBlendMode = (typeof sdkBlendModeValues)[number];
export declare const sdkButtonBorderShapeValues: readonly ['automatic', 'capsule', 'roundedRectangle', 'circle'];
export type SDKButtonBorderShape = (typeof sdkButtonBorderShapeValues)[number];
export declare const sdkButtonRepeatBehaviorValues: readonly ['automatic', 'enabled', 'disabled'];
export type SDKButtonRepeatBehavior = (typeof sdkButtonRepeatBehaviorValues)[number];
export declare const sdkButtonSizingValues: readonly ['automatic', 'flexible', 'fitted'];
export type SDKButtonSizing = (typeof sdkButtonSizingValues)[number];
export declare const sdkColorMultiplyValues: readonly ['accentColor', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'primary', 'secondary'];
export type SDKColorMultiply = (typeof sdkColorMultiplyValues)[number];
export declare const sdkColorSchemeValues: readonly ['light', 'dark'];
export type SDKColorScheme = (typeof sdkColorSchemeValues)[number];
export declare const sdkContentTransitionValues: readonly ['symbolEffect', 'identity', 'opacity', 'interpolate'];
export type SDKContentTransition = (typeof sdkContentTransitionValues)[number];
export declare const sdkControlSizeValues: readonly ['mini', 'small', 'regular', 'large', 'extraLarge'];
export type SDKControlSize = (typeof sdkControlSizeValues)[number];
export declare const sdkDefaultAdaptableTabBarPlacementValues: readonly ['automatic', 'tabBar', 'sidebar'];
export type SDKDefaultAdaptableTabBarPlacement = (typeof sdkDefaultAdaptableTabBarPlacementValues)[number];
export declare const sdkDefaultHoverEffectValues: readonly ['automatic', 'highlight', 'lift'];
export type SDKDefaultHoverEffect = (typeof sdkDefaultHoverEffectValues)[number];
export declare const sdkDefaultScrollAnchorValues: readonly ['zero', 'center', 'leading', 'trailing', 'top', 'bottom', 'topLeading', 'topTrailing', 'bottomLeading', 'bottomTrailing'];
export type SDKDefaultScrollAnchor = (typeof sdkDefaultScrollAnchorValues)[number];
export declare const sdkDefaultTabBarPlacementValues: readonly ['automatic', 'tabBar', 'sidebar'];
export type SDKDefaultTabBarPlacement = (typeof sdkDefaultTabBarPlacementValues)[number];
export declare const sdkDefersSystemGesturesValues: readonly ['top', 'leading', 'bottom', 'trailing', 'all', 'horizontal', 'vertical'];
export type SDKDefersSystemGestures = (typeof sdkDefersSystemGesturesValues)[number];
export declare const sdkDynamicTypeSizeValues: readonly ['xSmall', 'small', 'medium', 'large', 'xLarge', 'xxLarge', 'xxxLarge', 'accessibility1', 'accessibility2', 'accessibility3', 'accessibility4', 'accessibility5'];
export type SDKDynamicTypeSize = (typeof sdkDynamicTypeSizeValues)[number];
export declare const sdkEdgesIgnoringSafeAreaValues: readonly ['top', 'leading', 'bottom', 'trailing', 'all', 'horizontal', 'vertical'];
export type SDKEdgesIgnoringSafeArea = (typeof sdkEdgesIgnoringSafeAreaValues)[number];
export declare const sdkFileDialogBrowserOptionsValues: readonly ['enumeratePackages', 'includeHiddenFiles', 'displayFileExtensions'];
export type SDKFileDialogBrowserOptions = (typeof sdkFileDialogBrowserOptionsValues)[number];
export declare const sdkFontWidthValues: readonly ['compressed', 'condensed', 'standard', 'expanded'];
export type SDKFontWidth = (typeof sdkFontWidthValues)[number];
export declare const sdkForegroundColorValues: readonly ['accentColor', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'primary', 'secondary'];
export type SDKForegroundColor = (typeof sdkForegroundColorValues)[number];
export declare const sdkGlassEffectTransitionValues: readonly ['matchedGeometry', 'materialize', 'identity'];
export type SDKGlassEffectTransition = (typeof sdkGlassEffectTransitionValues)[number];
export declare const sdkGridCellAnchorValues: readonly ['zero', 'center', 'leading', 'trailing', 'top', 'bottom', 'topLeading', 'topTrailing', 'bottomLeading', 'bottomTrailing'];
export type SDKGridCellAnchor = (typeof sdkGridCellAnchorValues)[number];
export declare const sdkGridCellUnsizedAxesValues: readonly ['horizontal', 'vertical'];
export type SDKGridCellUnsizedAxes = (typeof sdkGridCellUnsizedAxesValues)[number];
export declare const sdkGridColumnAlignmentValues: readonly ['leading', 'center', 'trailing', 'listRowSeparatorLeading', 'listRowSeparatorTrailing'];
export type SDKGridColumnAlignment = (typeof sdkGridColumnAlignmentValues)[number];
export declare const sdkHeaderProminenceValues: readonly ['standard', 'increased'];
export type SDKHeaderProminence = (typeof sdkHeaderProminenceValues)[number];
export declare const sdkHoverEffectValues: readonly ['automatic', 'highlight', 'lift'];
export type SDKHoverEffect = (typeof sdkHoverEffectValues)[number];
export declare const sdkHueRotationValues: readonly ['zero'];
export type SDKHueRotation = (typeof sdkHueRotationValues)[number];
export declare const sdkLabelsVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKLabelsVisibility = (typeof sdkLabelsVisibilityValues)[number];
export declare const sdkLayoutDirectionBehaviorValues: readonly ['fixed', 'mirrors'];
export type SDKLayoutDirectionBehavior = (typeof sdkLayoutDirectionBehaviorValues)[number];
export declare const sdkListSectionIndexVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKListSectionIndexVisibility = (typeof sdkListSectionIndexVisibilityValues)[number];
export declare const sdkMapControlVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKMapControlVisibility = (typeof sdkMapControlVisibilityValues)[number];
export declare const sdkMapFeatureSelectionAccessoryValues: readonly ['automatic', 'callout', 'sheet', 'caption'];
export type SDKMapFeatureSelectionAccessory = (typeof sdkMapFeatureSelectionAccessoryValues)[number];
export declare const sdkMapStyleValues: readonly ['standard', 'imagery', 'hybrid'];
export type SDKMapStyle = (typeof sdkMapStyleValues)[number];
export declare const sdkMaterialActiveAppearanceValues: readonly ['automatic', 'active', 'matchWindow'];
export type SDKMaterialActiveAppearance = (typeof sdkMaterialActiveAppearanceValues)[number];
export declare const sdkMenuActionDismissBehaviorValues: readonly ['automatic', 'enabled', 'disabled'];
export type SDKMenuActionDismissBehavior = (typeof sdkMenuActionDismissBehaviorValues)[number];
export declare const sdkMenuIndicatorValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKMenuIndicator = (typeof sdkMenuIndicatorValues)[number];
export declare const sdkMenuOrderValues: readonly ['automatic', 'priority', 'fixed'];
export type SDKMenuOrder = (typeof sdkMenuOrderValues)[number];
export declare const sdkNavigationLinkIndicatorVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKNavigationLinkIndicatorVisibility = (typeof sdkNavigationLinkIndicatorVisibilityValues)[number];
export declare const sdkPaletteSelectionEffectValues: readonly ['automatic', 'custom'];
export type SDKPaletteSelectionEffect = (typeof sdkPaletteSelectionEffectValues)[number];
export declare const sdkPayLaterViewActionValues: readonly ['learnMore', 'calculator'];
export type SDKPayLaterViewAction = (typeof sdkPayLaterViewActionValues)[number];
export declare const sdkPayLaterViewDisplayStyleValues: readonly ['standard', 'badge', 'checkout', 'price'];
export type SDKPayLaterViewDisplayStyle = (typeof sdkPayLaterViewDisplayStyleValues)[number];
export declare const sdkPayWithApplePayButtonStyleValues: readonly ['white', 'whiteOutline', 'black', 'automatic'];
export type SDKPayWithApplePayButtonStyle = (typeof sdkPayWithApplePayButtonStyleValues)[number];
export declare const sdkPersistentSystemOverlaysValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKPersistentSystemOverlays = (typeof sdkPersistentSystemOverlaysValues)[number];
export declare const sdkPhotosPickerStyleValues: readonly ['presentation', 'inline', 'compact'];
export type SDKPhotosPickerStyle = (typeof sdkPhotosPickerStyleValues)[number];
export declare const sdkPreferredColorSchemeValues: readonly ['light', 'dark'];
export type SDKPreferredColorScheme = (typeof sdkPreferredColorSchemeValues)[number];
export declare const sdkPresentationBackgroundInteractionValues: readonly ['automatic', 'enabled', 'disabled'];
export type SDKPresentationBackgroundInteraction = (typeof sdkPresentationBackgroundInteractionValues)[number];
export declare const sdkPresentationCompactAdaptationValues: readonly ['automatic', 'none', 'popover', 'sheet', 'fullScreenCover'];
export type SDKPresentationCompactAdaptation = (typeof sdkPresentationCompactAdaptationValues)[number];
export declare const sdkPresentationContentInteractionValues: readonly ['automatic', 'resizes', 'scrolls'];
export type SDKPresentationContentInteraction = (typeof sdkPresentationContentInteractionValues)[number];
export declare const sdkPresentationDragIndicatorValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKPresentationDragIndicator = (typeof sdkPresentationDragIndicatorValues)[number];
export declare const sdkPresentationPlacementValues: readonly ['automatic', 'leading', 'center', 'trailing'];
export type SDKPresentationPlacement = (typeof sdkPresentationPlacementValues)[number];
export declare const sdkPreviewInterfaceOrientationValues: readonly ['portrait', 'portraitUpsideDown', 'landscapeLeft', 'landscapeRight'];
export type SDKPreviewInterfaceOrientation = (typeof sdkPreviewInterfaceOrientationValues)[number];
export declare const sdkProductDescriptionValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKProductDescription = (typeof sdkProductDescriptionValues)[number];
export declare const sdkRealityViewLayoutBehaviorValues: readonly ['flexible', 'centered', 'fixedSize'];
export type SDKRealityViewLayoutBehavior = (typeof sdkRealityViewLayoutBehaviorValues)[number];
export declare const sdkRedactedValues: readonly ['placeholder', 'privacy', 'invalidated'];
export type SDKRedacted = (typeof sdkRedactedValues)[number];
export declare const sdkScenePaddingValues: readonly ['top', 'leading', 'bottom', 'trailing', 'all', 'horizontal', 'vertical'];
export type SDKScenePadding = (typeof sdkScenePaddingValues)[number];
export declare const sdkScrollContentBackgroundValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKScrollContentBackground = (typeof sdkScrollContentBackgroundValues)[number];
export declare const sdkScrollDismissesKeyboardValues: readonly ['automatic', 'immediately', 'interactively', 'never'];
export type SDKScrollDismissesKeyboard = (typeof sdkScrollDismissesKeyboardValues)[number];
export declare const sdkSearchDictationBehaviorValues: readonly ['automatic'];
export type SDKSearchDictationBehavior = (typeof sdkSearchDictationBehaviorValues)[number];
export declare const sdkSearchPresentationToolbarBehaviorValues: readonly ['automatic', 'avoidHidingContent'];
export type SDKSearchPresentationToolbarBehavior = (typeof sdkSearchPresentationToolbarBehaviorValues)[number];
export declare const sdkSearchToolbarBehaviorValues: readonly ['automatic', 'minimize'];
export type SDKSearchToolbarBehavior = (typeof sdkSearchToolbarBehaviorValues)[number];
export declare const sdkShortcutsLinkStyleValues: readonly ['automatic', 'automaticOutline', 'light', 'lightOutline', 'dark', 'darkOutline'];
export type SDKShortcutsLinkStyle = (typeof sdkShortcutsLinkStyleValues)[number];
export declare const sdkSignInWithAppleButtonStyleValues: readonly ['black', 'white', 'whiteOutline'];
export type SDKSignInWithAppleButtonStyle = (typeof sdkSignInWithAppleButtonStyleValues)[number];
export declare const sdkSiriTipViewStyleValues: readonly ['automatic', 'light', 'dark'];
export type SDKSiriTipViewStyle = (typeof sdkSiriTipViewStyleValues)[number];
export declare const sdkSliderThumbVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKSliderThumbVisibility = (typeof sdkSliderThumbVisibilityValues)[number];
export declare const sdkSpringLoadingBehaviorValues: readonly ['automatic', 'enabled', 'disabled'];
export type SDKSpringLoadingBehavior = (typeof sdkSpringLoadingBehaviorValues)[number];
export declare const sdkSubmitLabelValues: readonly ['done', 'go', 'send', 'join', 'route', 'search', 'return', 'next', 'continue'];
export type SDKSubmitLabel = (typeof sdkSubmitLabelValues)[number];
export declare const sdkSubscriptionStoreButtonLabelValues: readonly ['automatic', 'singleLine', 'multiline', 'action', 'displayName', 'price'];
export type SDKSubscriptionStoreButtonLabel = (typeof sdkSubscriptionStoreButtonLabelValues)[number];
export declare const sdkSubscriptionStoreControlBackgroundValues: readonly ['automatic', 'gradientMaterial', 'gradientMaterialOnScroll'];
export type SDKSubscriptionStoreControlBackground = (typeof sdkSubscriptionStoreControlBackgroundValues)[number];
export declare const sdkSymbolColorRenderingModeValues: readonly ['flat', 'gradient'];
export type SDKSymbolColorRenderingMode = (typeof sdkSymbolColorRenderingModeValues)[number];
export declare const sdkSymbolRenderingModeValues: readonly ['monochrome', 'multicolor', 'hierarchical', 'palette'];
export type SDKSymbolRenderingMode = (typeof sdkSymbolRenderingModeValues)[number];
export declare const sdkSymbolVariableValueModeValues: readonly ['color', 'draw'];
export type SDKSymbolVariableValueMode = (typeof sdkSymbolVariableValueModeValues)[number];
export declare const sdkSymbolVariantValues: readonly ['none', 'circle', 'square', 'rectangle', 'fill', 'slash'];
export type SDKSymbolVariant = (typeof sdkSymbolVariantValues)[number];
export declare const sdkTabBarMinimizeBehaviorValues: readonly ['automatic', 'onScrollDown', 'onScrollUp', 'never'];
export type SDKTabBarMinimizeBehavior = (typeof sdkTabBarMinimizeBehaviorValues)[number];
export declare const sdkTableColumnHeadersValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKTableColumnHeaders = (typeof sdkTableColumnHeadersValues)[number];
export declare const sdkTabViewSearchActivationValues: readonly ['automatic', 'searchTabSelection'];
export type SDKTabViewSearchActivation = (typeof sdkTabViewSearchActivationValues)[number];
export declare const sdkTextInputAutocapitalizationValues: readonly ['never', 'words', 'sentences', 'characters'];
export type SDKTextInputAutocapitalization = (typeof sdkTextInputAutocapitalizationValues)[number];
export declare const sdkTextInputBorderShapeValues: readonly ['automatic', 'capsule', 'roundedRectangle'];
export type SDKTextInputBorderShape = (typeof sdkTextInputBorderShapeValues)[number];
export declare const sdkTextSelectionAffinityValues: readonly ['automatic', 'upstream', 'downstream'];
export type SDKTextSelectionAffinity = (typeof sdkTextSelectionAffinityValues)[number];
export declare const sdkToolbarValues: readonly ['sidebarToggle', 'title', 'search'];
export type SDKToolbar = (typeof sdkToolbarValues)[number];
export declare const sdkToolbarRoleValues: readonly ['automatic', 'navigationStack', 'browser', 'editor'];
export type SDKToolbarRole = (typeof sdkToolbarRoleValues)[number];
export declare const sdkToolbarTitleDisplayModeValues: readonly ['automatic', 'large', 'inlineLarge', 'inline'];
export type SDKToolbarTitleDisplayMode = (typeof sdkToolbarTitleDisplayModeValues)[number];
export declare const sdkTransitionValues: readonly ['opacity', 'slide', 'identity', 'scale'];
export type SDKTransition = (typeof sdkTransitionValues)[number];
export declare const sdkVerifyIdentityWithWalletButtonStyleValues: readonly ['black', 'blackOutline'];
export type SDKVerifyIdentityWithWalletButtonStyle = (typeof sdkVerifyIdentityWithWalletButtonStyleValues)[number];
export declare const sdkWebViewBackForwardNavigationGesturesValues: readonly ['automatic', 'enabled', 'disabled'];
export type SDKWebViewBackForwardNavigationGestures = (typeof sdkWebViewBackForwardNavigationGesturesValues)[number];
export declare const sdkWebViewContentBackgroundValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKWebViewContentBackground = (typeof sdkWebViewContentBackgroundValues)[number];
export declare const sdkWebViewElementFullscreenBehaviorValues: readonly ['automatic', 'enabled', 'disabled'];
export type SDKWebViewElementFullscreenBehavior = (typeof sdkWebViewElementFullscreenBehaviorValues)[number];
export declare const sdkWebViewLinkPreviewsValues: readonly ['automatic', 'enabled', 'disabled'];
export type SDKWebViewLinkPreviews = (typeof sdkWebViewLinkPreviewsValues)[number];
export declare const sdkWebViewMagnificationGesturesValues: readonly ['automatic', 'enabled', 'disabled'];
export type SDKWebViewMagnificationGestures = (typeof sdkWebViewMagnificationGesturesValues)[number];
export declare const sdkWindowToolbarFullScreenVisibilityValues: readonly ['automatic'];
export type SDKWindowToolbarFullScreenVisibility = (typeof sdkWindowToolbarFullScreenVisibilityValues)[number];
export declare const sdkWritingDirectionValues: readonly ['layoutBased', 'contentBased', 'default'];
export type SDKWritingDirection = (typeof sdkWritingDirectionValues)[number];
export declare const sdkWritingToolsAffordanceVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKWritingToolsAffordanceVisibility = (typeof sdkWritingToolsAffordanceVisibilityValues)[number];
export declare const sdkWritingToolsBehaviorValues: readonly ['automatic', 'complete', 'limited', 'disabled'];
export type SDKWritingToolsBehavior = (typeof sdkWritingToolsBehaviorValues)[number];
export interface OneNativeStyle {
    fontSize?: number;
    fontWeight?: string;
    fontDesign?: string;
    textStyle?: string;
    foregroundStyle?: ColorValue;
    tint?: ColorValue;
    background?: ColorValue;
    padding?: number;
    paddingTop?: number;
    paddingLeading?: number;
    paddingBottom?: number;
    paddingTrailing?: number;
    width?: number;
    height?: number;
    minWidth?: number;
    idealWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    idealHeight?: number;
    maxHeight?: number;
    cornerRadius?: number;
    opacity?: number;
    borderColor?: ColorValue;
    borderWidth?: number;
    glassEffect?: GlassEffect;
    glassEffectInteractive?: boolean;
    glassEffectTint?: ColorValue;
    glassEffectShape?: GlassEffectShape;
    material?: Material;
    accentColor?: SDKAccentColor | null;
    accessibilityAction?: () => void;
    accessibilityActivationPoint?: SDKAccessibilityActivationPoint;
    accessibilityAddTraits?: SDKAccessibilityAddTraits;
    accessibilityElement?: SDKAccessibilityElement;
    accessibilityHeading?: SDKAccessibilityHeading;
    accessibilityHidden?: boolean;
    accessibilityHint?: string;
    accessibilityIdentifier?: string;
    accessibilityIgnoresInvertColors?: boolean;
    accessibilityLabel?: string;
    accessibilityRemoveTraits?: SDKAccessibilityRemoveTraits;
    accessibilityRespondsToUserInteraction?: boolean;
    accessibilityShowsLargeContentViewer?: boolean;
    accessibilitySortPriority?: number;
    accessibilityTextContentType?: SDKAccessibilityTextContentType;
    accessibilityValue?: string;
    addPassToWalletButtonStyle?: SDKAddPassToWalletButtonStyle;
    allowedDynamicRange?: SDKAllowedDynamicRange | null;
    allowsHitTesting?: boolean;
    allowsTightening?: boolean;
    animation?: SDKAnimation | null;
    assistiveAccessNavigationIcon?: string;
    autocorrectionDisabled?: boolean;
    badgeProminence?: SDKBadgeProminence;
    baselineOffset?: number;
    blendMode?: SDKBlendMode;
    bold?: boolean;
    brightness?: number;
    buttonBorderShape?: SDKButtonBorderShape;
    buttonRepeatBehavior?: SDKButtonRepeatBehavior;
    buttonSizing?: SDKButtonSizing;
    clipped?: boolean;
    colorInvert?: boolean;
    colorMultiply?: SDKColorMultiply;
    colorScheme?: SDKColorScheme;
    compositingGroup?: boolean;
    contentTransition?: SDKContentTransition;
    contrast?: number;
    controlSize?: SDKControlSize;
    defaultAdaptableTabBarPlacement?: SDKDefaultAdaptableTabBarPlacement;
    defaultHoverEffect?: SDKDefaultHoverEffect | null;
    defaultScrollAnchor?: SDKDefaultScrollAnchor | null;
    defaultTabBarPlacement?: SDKDefaultTabBarPlacement;
    defersSystemGestures?: SDKDefersSystemGestures;
    deleteDisabled?: boolean;
    dialogSuppressionToggle?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    disableAutocorrection?: boolean | null;
    disabled?: boolean;
    documentLaunchSubtitle?: string;
    documentLaunchTitle?: string;
    dynamicTypeSize?: SDKDynamicTypeSize;
    edgesIgnoringSafeArea?: SDKEdgesIgnoringSafeArea;
    fileDialogBrowserOptions?: SDKFileDialogBrowserOptions;
    fileDialogConfirmationLabel?: string | null;
    fileDialogCustomizationID?: string;
    fileDialogImportsUnresolvedAliases?: boolean;
    fileDialogMessage?: string | null;
    fileExporterFilenameLabel?: string | null;
    findDisabled?: boolean;
    findNavigator?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    fixedSize?: boolean;
    flipsForRightToLeftLayoutDirection?: boolean;
    focusable?: boolean;
    focusEffectDisabled?: boolean;
    fontWidth?: SDKFontWidth | null;
    foregroundColor?: SDKForegroundColor | null;
    geometryGroup?: boolean;
    glassEffectTransition?: SDKGlassEffectTransition;
    grayscale?: number;
    gridCellAnchor?: SDKGridCellAnchor;
    gridCellColumns?: number;
    gridCellUnsizedAxes?: SDKGridCellUnsizedAxes;
    gridColumnAlignment?: SDKGridColumnAlignment;
    headerProminence?: SDKHeaderProminence;
    help?: string;
    hidden?: boolean;
    hoverEffect?: SDKHoverEffect;
    hoverEffectDisabled?: boolean;
    hueRotation?: SDKHueRotation;
    inspectorColumnWidth?: number;
    interactionActivityTrackingTag?: string;
    interactiveDismissDisabled?: boolean;
    invalidatableContent?: boolean;
    italic?: boolean;
    kerning?: number;
    labelIconToTitleSpacing?: number;
    labelReservedIconWidth?: number;
    labelsHidden?: boolean;
    labelsVisibility?: SDKLabelsVisibility;
    layoutDirectionBehavior?: SDKLayoutDirectionBehavior;
    layoutPriority?: number;
    lineLimit?: number | null;
    lineSpacing?: number;
    listRowSpacing?: number | null;
    listSectionIndexVisibility?: SDKListSectionIndexVisibility;
    luminanceToAlpha?: boolean;
    manageSubscriptionsSheet?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    mapControlVisibility?: SDKMapControlVisibility;
    mapFeatureSelectionAccessory?: SDKMapFeatureSelectionAccessory | null;
    mapStyle?: SDKMapStyle;
    materialActiveAppearance?: SDKMaterialActiveAppearance;
    menuActionDismissBehavior?: SDKMenuActionDismissBehavior;
    menuIndicator?: SDKMenuIndicator;
    menuOrder?: SDKMenuOrder;
    minimumScaleFactor?: number;
    monospaced?: boolean;
    monospacedDigit?: boolean;
    moveDisabled?: boolean;
    musicSubscriptionOffer?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    navigationBarBackButtonHidden?: boolean;
    navigationBarHidden?: boolean;
    navigationBarTitle?: string;
    navigationLinkIndicatorVisibility?: SDKNavigationLinkIndicatorVisibility;
    navigationSplitViewColumnWidth?: number;
    navigationSubtitle?: string;
    offerCodeRedemption?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    onAppear?: () => void;
    onDisappear?: () => void;
    onHover?: (value: boolean) => void;
    onInteractiveResizeChange?: (value: boolean) => void;
    onMapCameraChange?: () => void;
    onScrollVisibilityChange?: (value: boolean) => void;
    onSubmit?: () => void;
    onTapGesture?: () => void;
    paletteSelectionEffect?: SDKPaletteSelectionEffect;
    payLaterViewAction?: SDKPayLaterViewAction;
    payLaterViewDisplayStyle?: SDKPayLaterViewDisplayStyle;
    payWithApplePayButtonDisableCardArt?: boolean;
    payWithApplePayButtonStyle?: SDKPayWithApplePayButtonStyle;
    persistentSystemOverlays?: SDKPersistentSystemOverlays;
    photosPickerSearchText?: string | null;
    photosPickerStyle?: SDKPhotosPickerStyle;
    preferredColorScheme?: SDKPreferredColorScheme | null;
    presentationBackgroundInteraction?: SDKPresentationBackgroundInteraction;
    presentationCompactAdaptation?: SDKPresentationCompactAdaptation;
    presentationContentInteraction?: SDKPresentationContentInteraction;
    presentationCornerRadius?: number | null;
    presentationDragIndicator?: SDKPresentationDragIndicator;
    presentationPlacement?: SDKPresentationPlacement;
    previewDisplayName?: string | null;
    previewInterfaceOrientation?: SDKPreviewInterfaceOrientation;
    privacySensitive?: boolean;
    productDescription?: SDKProductDescription;
    productIconBorder?: boolean;
    realityViewLayoutBehavior?: SDKRealityViewLayoutBehavior;
    redacted?: SDKRedacted;
    renameAction?: () => void;
    replaceDisabled?: boolean;
    safeAreaPadding?: number;
    saturation?: number;
    scaledToFill?: boolean;
    scaledToFit?: boolean;
    scenePadding?: SDKScenePadding;
    scrollClipDisabled?: boolean;
    scrollContentBackground?: SDKScrollContentBackground;
    scrollDisabled?: boolean;
    scrollDismissesKeyboard?: SDKScrollDismissesKeyboard;
    scrollIndicatorsFlash?: boolean;
    scrollTargetLayout?: boolean;
    searchable?: Readonly<{
        value: string;
        onChange: (value: string) => void;
    }>;
    searchCompletion?: string;
    searchDictationBehavior?: SDKSearchDictationBehavior;
    searchPresentationToolbarBehavior?: SDKSearchPresentationToolbarBehavior;
    searchToolbarBehavior?: SDKSearchToolbarBehavior;
    sectionIndexLabel?: string | null;
    selectionDisabled?: boolean;
    shortcutsLinkStyle?: SDKShortcutsLinkStyle;
    signInWithAppleButtonStyle?: SDKSignInWithAppleButtonStyle;
    siriTipViewStyle?: SDKSiriTipViewStyle;
    sliderThumbVisibility?: SDKSliderThumbVisibility;
    speechAdjustedPitch?: number;
    speechAlwaysIncludesPunctuation?: boolean;
    speechAnnouncementsQueued?: boolean;
    speechSpellsOutCharacters?: boolean;
    springLoadingBehavior?: SDKSpringLoadingBehavior;
    statusBar?: boolean;
    statusBarHidden?: boolean;
    submitLabel?: SDKSubmitLabel;
    submitScope?: boolean;
    subscriptionStoreButtonLabel?: SDKSubscriptionStoreButtonLabel;
    subscriptionStoreControlBackground?: SDKSubscriptionStoreControlBackground;
    swipeActionsContainer?: boolean;
    symbolColorRenderingMode?: SDKSymbolColorRenderingMode | null;
    symbolEffectsRemoved?: boolean;
    symbolRenderingMode?: SDKSymbolRenderingMode | null;
    symbolVariableValueMode?: SDKSymbolVariableValueMode | null;
    symbolVariant?: SDKSymbolVariant;
    tabBarMinimizeBehavior?: SDKTabBarMinimizeBehavior;
    tableColumnHeaders?: SDKTableColumnHeaders;
    tabViewSearchActivation?: SDKTabViewSearchActivation;
    textInputAutocapitalization?: SDKTextInputAutocapitalization | null;
    textInputBorderShape?: SDKTextInputBorderShape;
    textSelectionAffinity?: SDKTextSelectionAffinity;
    toolbar?: SDKToolbar | null;
    toolbarRole?: SDKToolbarRole;
    toolbarTitleDisplayMode?: SDKToolbarTitleDisplayMode;
    tracking?: number;
    transition?: SDKTransition;
    typeSelectEquivalent?: string | null;
    unredacted?: boolean;
    verifyIdentityWithWalletButtonStyle?: SDKVerifyIdentityWithWalletButtonStyle;
    webViewBackForwardNavigationGestures?: SDKWebViewBackForwardNavigationGestures;
    webViewContentBackground?: SDKWebViewContentBackground;
    webViewElementFullscreenBehavior?: SDKWebViewElementFullscreenBehavior;
    webViewLinkPreviews?: SDKWebViewLinkPreviews;
    webViewMagnificationGestures?: SDKWebViewMagnificationGestures;
    windowToolbarFullScreenVisibility?: SDKWindowToolbarFullScreenVisibility;
    writingDirection?: SDKWritingDirection;
    writingToolsAffordanceVisibility?: SDKWritingToolsAffordanceVisibility;
    writingToolsBehavior?: SDKWritingToolsBehavior;
    zIndex?: number;
}
export type OneNativeViewProps = Pick<ViewProps, 'accessibilityLabel' | 'accessibilityHint' | 'accessibilityValue' | 'testID' | 'style' | 'onLayout'> & {
    swiftStyle?: OneNativeStyle;
};
export type PickerOption = Readonly<{
    value: string;
    label: string;
}>;
export type DialogAction = Readonly<{
    id: string;
    label: string;
    role?: Styles.ButtonRole;
}>;
export type MapMarker = Readonly<{
    id: string;
    label: string;
    latitude: number;
    longitude: number;
}>;
export interface PickerProps extends OneNativeViewProps {
    selection: string;
    onSelectionChange: (value: string) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    options: readonly PickerOption[];
    pickerStyle?: Styles.PickerStyle;
}
export interface DatePickerProps extends OneNativeViewProps {
    selection: Date;
    onSelectionChange: (value: Date) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumDate?: Date;
    maximumDate?: Date;
    displayedComponents?: 'date' | 'hourAndMinute' | 'dateAndTime';
    datePickerStyle?: Styles.DatePickerStyle;
}
export interface ColorPickerProps extends OneNativeViewProps {
    selection: string;
    onSelectionChange: (value: string) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    supportsOpacity?: boolean;
}
export interface ToggleProps extends OneNativeViewProps {
    isOn: boolean;
    onIsOnChange: (value: boolean) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    systemImage?: string;
    toggleStyle?: Styles.ToggleStyle;
}
export interface SliderProps extends OneNativeViewProps {
    value: number;
    onValueChange: (value: number) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    minimumValueLabel?: string;
    maximumValueLabel?: string;
    minimumValueImage?: string;
    maximumValueImage?: string;
}
export interface StepperProps extends OneNativeViewProps {
    value: number;
    onValueChange: (value: number) => void;
    revision?: number;
    label?: string;
    disabled?: boolean;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
}
export interface TextProps extends OneNativeViewProps {
    text?: string;
}
export interface LabelProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    systemImage?: string;
}
export interface ProgressViewProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    value?: number;
    total?: number;
    progressViewStyle?: Styles.ProgressViewStyle;
}
export interface GaugeProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    value?: number;
    minimumValue?: number;
    maximumValue?: number;
    currentValueLabel?: string;
    minimumValueLabel?: string;
    maximumValueLabel?: string;
    gaugeStyle?: Styles.GaugeStyle;
}
export interface ImageProps extends OneNativeViewProps {
    systemName?: string;
    symbolRenderingMode?: Styles.SymbolRenderingMode | '';
    symbolVariant?: Styles.SymbolVariants | '';
    imageScale?: Styles.ImageScale | '';
    variableValue?: number;
    colorRole?: IconColorRole | '';
}
export interface ShareLinkProps extends OneNativeViewProps {
    label?: string;
    disabled?: boolean;
    systemImage?: string;
    item?: string;
    itemType?: 'text' | 'url';
    subject?: string;
    message?: string;
}
export interface ContentUnavailableViewProps extends OneNativeViewProps {
    onAction?: (id: string) => void;
    title?: string;
    systemImage?: string;
    description?: string;
    actions: readonly DialogAction[];
}
export interface CircleProps extends OneNativeViewProps {
    fill?: ColorValue;
}
export interface CapsuleProps extends OneNativeViewProps {
    fill?: ColorValue;
}
export interface RectangleProps extends OneNativeViewProps {
    fill?: ColorValue;
}
export interface RoundedRectangleProps extends OneNativeViewProps {
    fill?: ColorValue;
    cornerRadius?: number;
}
export interface EllipseProps extends OneNativeViewProps {
    fill?: ColorValue;
}
export interface VideoPlayerProps extends OneNativeViewProps {
    url?: string;
    autoplay?: boolean;
}
export interface PhotosPickerProps extends OneNativeViewProps {
    onPick?: (url: string, index: number, count: number) => void;
    onPickError?: (message: string) => void;
    label?: string;
    disabled?: boolean;
    systemImage?: string;
    maxSelectionCount?: number;
    selectionBehavior?: Styles.PhotosPickerSelectionBehavior;
    filter?: 'any' | 'images' | 'videos' | 'livePhotos' | 'screenshots' | 'screenRecordings' | 'slomoVideos' | 'timelapseVideos' | 'cinematicVideos' | 'depthEffectPhotos' | 'bursts' | 'panoramas';
    preferredItemEncoding?: Styles.EncodingDisambiguationPolicy;
}
export interface WebViewProps extends OneNativeViewProps {
    onNavigate?: (url: string) => void;
    onTitleChange?: (title: string) => void;
    onLoadingChange?: (loading: boolean, progress: number) => void;
    url?: string;
    html?: string;
    backForwardNavigationGestures?: Styles.BackForwardNavigationGesturesBehavior | '';
    magnificationGestures?: Styles.MagnificationGesturesBehavior | '';
    linkPreviews?: Styles.LinkPreviewBehavior | '';
    elementFullscreen?: Styles.ElementFullscreenBehavior | '';
    contentBackground?: Styles.Visibility | '';
}
export type SignInWithAppleButtonCompletion = Readonly<{
    type: 'success';
    user: string;
    email: string;
    givenName: string;
    familyName: string;
    identityToken: string;
    authorizationCode: string;
}> | Readonly<{
    type: 'failed';
    message: string;
}> | Readonly<{
    type: 'cancelled';
}>;
export interface SignInWithAppleButtonProps extends OneNativeViewProps {
    onCompletion?: (completion: SignInWithAppleButtonCompletion) => void;
    requestedScopes?: readonly ('fullName' | 'email')[];
    nonce?: string;
}
export interface MapProps extends OneNativeViewProps {
    onRegionChange?: (latitude: number, longitude: number, distance: number) => void;
    latitude?: number;
    longitude?: number;
    distance?: number;
    markers: readonly MapMarker[];
}
export interface TextFieldProps extends OneNativeViewProps {
    text: string | NativeState<string>;
    onTextChange: (value: string) => void;
    revision?: number;
    focused?: boolean;
    onFocusChange?: (focused: boolean) => void;
    focusRevision?: number;
    onSubmit?: () => void;
    label?: string;
    disabled?: boolean;
    prompt?: string;
    textFieldStyle?: Styles.TextFieldStyle;
    submitLabel?: Styles.SubmitLabel | '';
    textInputAutocapitalization?: Styles.TextInputAutocapitalization | '';
    autocorrectionDisabled?: boolean;
    keyboardType?: KeyboardType | '';
    textContentType?: TextContentType | '';
    axis?: Styles.Axis;
}
export interface SecureFieldProps extends OneNativeViewProps {
    text: string | NativeState<string>;
    onTextChange: (value: string) => void;
    revision?: number;
    focused?: boolean;
    onFocusChange?: (focused: boolean) => void;
    focusRevision?: number;
    onSubmit?: () => void;
    label?: string;
    disabled?: boolean;
    prompt?: string;
    textFieldStyle?: Styles.TextFieldStyle;
    submitLabel?: Styles.SubmitLabel | '';
    textInputAutocapitalization?: Styles.TextInputAutocapitalization | '';
    autocorrectionDisabled?: boolean;
    keyboardType?: KeyboardType | '';
    textContentType?: TextContentType | '';
}
export interface AlertProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    onAction?: (id: string, presenting: string) => void;
    title?: string;
    message?: string;
    presenting?: string;
    actions: readonly DialogAction[];
}
export interface ConfirmationDialogProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    onAction?: (id: string, presenting: string) => void;
    title?: string;
    message?: string;
    presenting?: string;
    actions: readonly DialogAction[];
    titleVisibility?: Styles.Visibility;
}
export interface QuickLookProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    url?: string;
}
export type FileImporterCompletion = Readonly<{
    type: 'success';
    url: string;
    index: number;
    count: number;
}> | Readonly<{
    type: 'failed';
    message: string;
}> | Readonly<{
    type: 'cancelled';
}>;
export interface FileImporterProps extends OneNativeViewProps {
    isPresented: boolean;
    onIsPresentedChange: (value: boolean) => void;
    revision?: number;
    onCompletion?: (completion: FileImporterCompletion) => void;
    allowedContentTypes?: readonly string[];
    allowsMultipleSelection?: boolean;
}
export interface EditButtonProps extends OneNativeViewProps {
}
export interface EmptyViewProps extends OneNativeViewProps {
}
//# sourceMappingURL=controlTypes.d.ts.map