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
export declare const sdkAccessibilityActivationPointWithUnitPointValues: readonly ['zero', 'center', 'leading', 'trailing', 'top', 'bottom', 'topLeading', 'topTrailing', 'bottomLeading', 'bottomTrailing'];
export type SDKAccessibilityActivationPointWithUnitPoint = (typeof sdkAccessibilityActivationPointWithUnitPointValues)[number];
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
export declare const sdkAccessibilityWithActivationPointValues: readonly ['zero', 'center', 'leading', 'trailing', 'top', 'bottom', 'topLeading', 'topTrailing', 'bottomLeading', 'bottomTrailing'];
export type SDKAccessibilityWithActivationPoint = (typeof sdkAccessibilityWithActivationPointValues)[number];
export declare const sdkAccessibilityWithAddTraitsValues: readonly ['isButton', 'isHeader', 'isSelected', 'isLink', 'isSearchField', 'isImage', 'playsSound', 'isKeyboardKey', 'isStaticText', 'isSummaryElement', 'updatesFrequently', 'startsMediaSession', 'allowsDirectInteraction', 'causesPageTurn', 'isModal', 'isToggle', 'isTabBar'];
export type SDKAccessibilityWithAddTraits = (typeof sdkAccessibilityWithAddTraitsValues)[number];
export declare const sdkAccessibilityWithRemoveTraitsValues: readonly ['isButton', 'isHeader', 'isSelected', 'isLink', 'isSearchField', 'isImage', 'playsSound', 'isKeyboardKey', 'isStaticText', 'isSummaryElement', 'updatesFrequently', 'startsMediaSession', 'allowsDirectInteraction', 'causesPageTurn', 'isModal', 'isToggle', 'isTabBar'];
export type SDKAccessibilityWithRemoveTraits = (typeof sdkAccessibilityWithRemoveTraitsValues)[number];
export declare const sdkAddPassToWalletButtonStyleValues: readonly ['black', 'blackOutline'];
export type SDKAddPassToWalletButtonStyle = (typeof sdkAddPassToWalletButtonStyleValues)[number];
export declare const sdkAllowedDynamicRangeValues: readonly ['standard', 'constrainedHigh', 'high'];
export type SDKAllowedDynamicRange = (typeof sdkAllowedDynamicRangeValues)[number];
export declare const sdkAnimationValues: readonly ['default', 'interpolatingSpring', 'spring', 'interactiveSpring', 'smooth', 'snappy', 'bouncy', 'easeInOut', 'easeIn', 'easeOut', 'linear'];
export type SDKAnimation = (typeof sdkAnimationValues)[number];
export declare const sdkBackgroundStyleValues: readonly ['placeholder', 'link', 'selection', 'windowBackground', 'fill', 'regularMaterial', 'thickMaterial', 'thinMaterial', 'ultraThinMaterial', 'ultraThickMaterial', 'bar', 'primary', 'secondary', 'tertiary', 'quaternary', 'quinary', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'separator', 'background', 'foreground', 'tint'];
export type SDKBackgroundStyle = (typeof sdkBackgroundStyleValues)[number];
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
export declare const sdkButtonStyleValues: readonly ['automatic', 'glass', 'borderless', 'glassProminent', 'plain', 'bordered', 'borderedProminent'];
export type SDKButtonStyle = (typeof sdkButtonStyleValues)[number];
export declare const sdkColorMultiplyValues: readonly ['accentColor', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'primary', 'secondary'];
export type SDKColorMultiply = (typeof sdkColorMultiplyValues)[number];
export declare const sdkColorSchemeValues: readonly ['light', 'dark'];
export type SDKColorScheme = (typeof sdkColorSchemeValues)[number];
export declare const sdkContentTransitionValues: readonly ['symbolEffect', 'identity', 'opacity', 'interpolate'];
export type SDKContentTransition = (typeof sdkContentTransitionValues)[number];
export declare const sdkControlGroupStyleValues: readonly ['palette', 'automatic', 'navigation', 'menu', 'compactMenu'];
export type SDKControlGroupStyle = (typeof sdkControlGroupStyleValues)[number];
export declare const sdkControlSizeValues: readonly ['mini', 'small', 'regular', 'large', 'extraLarge'];
export type SDKControlSize = (typeof sdkControlSizeValues)[number];
export declare const sdkDatePickerStyleValues: readonly ['wheel', 'automatic', 'graphical', 'compact'];
export type SDKDatePickerStyle = (typeof sdkDatePickerStyleValues)[number];
export declare const sdkDefaultAdaptableTabBarPlacementValues: readonly ['automatic', 'tabBar', 'sidebar'];
export type SDKDefaultAdaptableTabBarPlacement = (typeof sdkDefaultAdaptableTabBarPlacementValues)[number];
export declare const sdkDefaultHoverEffectValues: readonly ['automatic', 'highlight', 'lift'];
export type SDKDefaultHoverEffect = (typeof sdkDefaultHoverEffectValues)[number];
export declare const sdkDefaultScrollAnchorWithOptionalUnitPointValues: readonly ['zero', 'center', 'leading', 'trailing', 'top', 'bottom', 'topLeading', 'topTrailing', 'bottomLeading', 'bottomTrailing'];
export type SDKDefaultScrollAnchorWithOptionalUnitPoint = (typeof sdkDefaultScrollAnchorWithOptionalUnitPointValues)[number];
export declare const sdkDefaultTabBarPlacementValues: readonly ['automatic', 'tabBar', 'sidebar'];
export type SDKDefaultTabBarPlacement = (typeof sdkDefaultTabBarPlacementValues)[number];
export declare const sdkDefersSystemGesturesValues: readonly ['top', 'leading', 'bottom', 'trailing', 'all', 'horizontal', 'vertical'];
export type SDKDefersSystemGestures = (typeof sdkDefersSystemGesturesValues)[number];
export declare const sdkDisclosureGroupStyleValues: readonly ['automatic'];
export type SDKDisclosureGroupStyle = (typeof sdkDisclosureGroupStyleValues)[number];
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
export declare const sdkFormStyleValues: readonly ['columns', 'grouped', 'automatic'];
export type SDKFormStyle = (typeof sdkFormStyleValues)[number];
export declare const sdkGaugeStyleValues: readonly ['accessoryCircularCapacity', 'linearCapacity', 'accessoryLinear', 'accessoryLinearCapacity', 'automatic', 'accessoryCircular'];
export type SDKGaugeStyle = (typeof sdkGaugeStyleValues)[number];
export declare const sdkGlassEffectTransitionValues: readonly ['matchedGeometry', 'materialize', 'identity'];
export type SDKGlassEffectTransition = (typeof sdkGlassEffectTransitionValues)[number];
export declare const sdkGridCellAnchorValues: readonly ['zero', 'center', 'leading', 'trailing', 'top', 'bottom', 'topLeading', 'topTrailing', 'bottomLeading', 'bottomTrailing'];
export type SDKGridCellAnchor = (typeof sdkGridCellAnchorValues)[number];
export declare const sdkGridCellUnsizedAxesValues: readonly ['horizontal', 'vertical'];
export type SDKGridCellUnsizedAxes = (typeof sdkGridCellUnsizedAxesValues)[number];
export declare const sdkGridColumnAlignmentValues: readonly ['leading', 'center', 'trailing', 'listRowSeparatorLeading', 'listRowSeparatorTrailing'];
export type SDKGridColumnAlignment = (typeof sdkGridColumnAlignmentValues)[number];
export declare const sdkGroupBoxStyleValues: readonly ['automatic'];
export type SDKGroupBoxStyle = (typeof sdkGroupBoxStyleValues)[number];
export declare const sdkHeaderProminenceValues: readonly ['standard', 'increased'];
export type SDKHeaderProminence = (typeof sdkHeaderProminenceValues)[number];
export declare const sdkHoverEffectWithHoverEffectValues: readonly ['automatic', 'highlight', 'lift'];
export type SDKHoverEffectWithHoverEffect = (typeof sdkHoverEffectWithHoverEffectValues)[number];
export declare const sdkHueRotationValues: readonly ['zero'];
export type SDKHueRotation = (typeof sdkHueRotationValues)[number];
export declare const sdkImageScaleValues: readonly ['small', 'medium', 'large'];
export type SDKImageScale = (typeof sdkImageScaleValues)[number];
export declare const sdkIndexViewStyleValues: readonly ['page'];
export type SDKIndexViewStyle = (typeof sdkIndexViewStyleValues)[number];
export declare const sdkKeyboardShortcutWithKeyboardShortcutValues: readonly ['defaultAction', 'cancelAction'];
export type SDKKeyboardShortcutWithKeyboardShortcut = (typeof sdkKeyboardShortcutWithKeyboardShortcutValues)[number];
export declare const sdkKeyboardShortcutWithOptionalKeyboardShortcutValues: readonly ['defaultAction', 'cancelAction'];
export type SDKKeyboardShortcutWithOptionalKeyboardShortcut = (typeof sdkKeyboardShortcutWithOptionalKeyboardShortcutValues)[number];
export declare const sdkLabeledContentStyleValues: readonly ['automatic'];
export type SDKLabeledContentStyle = (typeof sdkLabeledContentStyleValues)[number];
export declare const sdkLabelStyleValues: readonly ['automatic', 'iconOnly', 'titleAndIcon', 'titleOnly'];
export type SDKLabelStyle = (typeof sdkLabelStyleValues)[number];
export declare const sdkLabelsVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKLabelsVisibility = (typeof sdkLabelsVisibilityValues)[number];
export declare const sdkLayoutDirectionBehaviorValues: readonly ['fixed', 'mirrors'];
export type SDKLayoutDirectionBehavior = (typeof sdkLayoutDirectionBehaviorValues)[number];
export declare const sdkListItemTintWithOptionalColorValues: readonly ['accentColor', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'primary', 'secondary'];
export type SDKListItemTintWithOptionalColor = (typeof sdkListItemTintWithOptionalColorValues)[number];
export declare const sdkListItemTintWithOptionalListItemTintValues: readonly ['monochrome'];
export type SDKListItemTintWithOptionalListItemTint = (typeof sdkListItemTintWithOptionalListItemTintValues)[number];
export declare const sdkListSectionIndexVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKListSectionIndexVisibility = (typeof sdkListSectionIndexVisibilityValues)[number];
export declare const sdkListSectionSpacingWithListSectionSpacingValues: readonly ['default', 'compact'];
export type SDKListSectionSpacingWithListSectionSpacing = (typeof sdkListSectionSpacingWithListSectionSpacingValues)[number];
export declare const sdkListStyleValues: readonly ['automatic', 'sidebar', 'inset', 'grouped', 'insetGrouped', 'plain'];
export type SDKListStyle = (typeof sdkListStyleValues)[number];
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
export declare const sdkMenuStyleValues: readonly ['button', 'automatic', 'borderlessButton'];
export type SDKMenuStyle = (typeof sdkMenuStyleValues)[number];
export declare const sdkMultilineTextAlignmentWithStrategyValues: readonly ['layoutBased', 'writingDirectionBased', 'default'];
export type SDKMultilineTextAlignmentWithStrategy = (typeof sdkMultilineTextAlignmentWithStrategyValues)[number];
export declare const sdkMultilineTextAlignmentWithTextAlignmentValues: readonly ['leading', 'center', 'trailing'];
export type SDKMultilineTextAlignmentWithTextAlignment = (typeof sdkMultilineTextAlignmentWithTextAlignmentValues)[number];
export declare const sdkNavigationBarTitleDisplayModeValues: readonly ['automatic', 'inline', 'large'];
export type SDKNavigationBarTitleDisplayMode = (typeof sdkNavigationBarTitleDisplayModeValues)[number];
export declare const sdkNavigationLinkIndicatorVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKNavigationLinkIndicatorVisibility = (typeof sdkNavigationLinkIndicatorVisibilityValues)[number];
export declare const sdkNavigationSplitViewStyleValues: readonly ['balanced', 'prominentDetail', 'automatic'];
export type SDKNavigationSplitViewStyle = (typeof sdkNavigationSplitViewStyleValues)[number];
export declare const sdkNavigationViewStyleValues: readonly ['columns', 'automatic', 'stack'];
export type SDKNavigationViewStyle = (typeof sdkNavigationViewStyleValues)[number];
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
export declare const sdkPickerStyleValues: readonly ['wheel', 'inline', 'automatic', 'segmented', 'tabs', 'palette', 'navigationLink', 'menu'];
export type SDKPickerStyle = (typeof sdkPickerStyleValues)[number];
export declare const sdkPreferredColorSchemeValues: readonly ['light', 'dark'];
export type SDKPreferredColorScheme = (typeof sdkPreferredColorSchemeValues)[number];
export declare const sdkPresentationBackgroundValues: readonly ['placeholder', 'link', 'selection', 'windowBackground', 'fill', 'regularMaterial', 'thickMaterial', 'thinMaterial', 'ultraThinMaterial', 'ultraThickMaterial', 'bar', 'primary', 'secondary', 'tertiary', 'quaternary', 'quinary', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'separator', 'background', 'foreground', 'tint'];
export type SDKPresentationBackground = (typeof sdkPresentationBackgroundValues)[number];
export declare const sdkPresentationBackgroundInteractionValues: readonly ['automatic', 'enabled', 'disabled'];
export type SDKPresentationBackgroundInteraction = (typeof sdkPresentationBackgroundInteractionValues)[number];
export declare const sdkPresentationCompactAdaptationWithPresentationAdaptationValues: readonly ['automatic', 'none', 'popover', 'sheet', 'fullScreenCover'];
export type SDKPresentationCompactAdaptationWithPresentationAdaptation = (typeof sdkPresentationCompactAdaptationWithPresentationAdaptationValues)[number];
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
export declare const sdkProgressViewStyleValues: readonly ['linear', 'circular', 'automatic'];
export type SDKProgressViewStyle = (typeof sdkProgressViewStyleValues)[number];
export declare const sdkRealityViewLayoutBehaviorValues: readonly ['flexible', 'centered', 'fixedSize'];
export type SDKRealityViewLayoutBehavior = (typeof sdkRealityViewLayoutBehaviorValues)[number];
export declare const sdkRedactedValues: readonly ['placeholder', 'privacy', 'invalidated'];
export type SDKRedacted = (typeof sdkRedactedValues)[number];
export declare const sdkScenePaddingWithSetValues: readonly ['top', 'leading', 'bottom', 'trailing', 'all', 'horizontal', 'vertical'];
export type SDKScenePaddingWithSet = (typeof sdkScenePaddingWithSetValues)[number];
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
export declare const sdkTableStyleValues: readonly ['inset', 'automatic'];
export type SDKTableStyle = (typeof sdkTableStyleValues)[number];
export declare const sdkTabViewSearchActivationValues: readonly ['automatic', 'searchTabSelection'];
export type SDKTabViewSearchActivation = (typeof sdkTabViewSearchActivationValues)[number];
export declare const sdkTabViewStyleValues: readonly ['sidebarAdaptable', 'page', 'tabBarOnly', 'automatic'];
export type SDKTabViewStyle = (typeof sdkTabViewStyleValues)[number];
export declare const sdkTextCaseValues: readonly ['uppercase', 'lowercase'];
export type SDKTextCase = (typeof sdkTextCaseValues)[number];
export declare const sdkTextFieldStyleValues: readonly ['automatic', 'roundedBorder', 'bordered', 'plain'];
export type SDKTextFieldStyle = (typeof sdkTextFieldStyleValues)[number];
export declare const sdkTextInputAutocapitalizationValues: readonly ['never', 'words', 'sentences', 'characters'];
export type SDKTextInputAutocapitalization = (typeof sdkTextInputAutocapitalizationValues)[number];
export declare const sdkTextInputBorderShapeValues: readonly ['automatic', 'capsule', 'roundedRectangle'];
export type SDKTextInputBorderShape = (typeof sdkTextInputBorderShapeValues)[number];
export declare const sdkTextSelectionValues: readonly ['enabled', 'disabled'];
export type SDKTextSelection = (typeof sdkTextSelectionValues)[number];
export declare const sdkTextSelectionAffinityValues: readonly ['automatic', 'upstream', 'downstream'];
export type SDKTextSelectionAffinity = (typeof sdkTextSelectionAffinityValues)[number];
export declare const sdkToggleStyleValues: readonly ['button', 'automatic', 'switch'];
export type SDKToggleStyle = (typeof sdkToggleStyleValues)[number];
export declare const sdkToolbarRoleValues: readonly ['automatic', 'navigationStack', 'browser', 'editor'];
export type SDKToolbarRole = (typeof sdkToolbarRoleValues)[number];
export declare const sdkToolbarTitleDisplayModeValues: readonly ['automatic', 'large', 'inlineLarge', 'inline'];
export type SDKToolbarTitleDisplayMode = (typeof sdkToolbarTitleDisplayModeValues)[number];
export declare const sdkToolbarWithRemovingValues: readonly ['sidebarToggle', 'title', 'search'];
export type SDKToolbarWithRemoving = (typeof sdkToolbarWithRemovingValues)[number];
export declare const sdkTransitionValues: readonly ['opacity', 'slide', 'identity', 'scale'];
export type SDKTransition = (typeof sdkTransitionValues)[number];
export declare const sdkTruncationModeValues: readonly ['head', 'tail', 'middle'];
export type SDKTruncationMode = (typeof sdkTruncationModeValues)[number];
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
export declare const sdkWebViewTextSelectionValues: readonly ['enabled', 'disabled'];
export type SDKWebViewTextSelection = (typeof sdkWebViewTextSelectionValues)[number];
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
    accessibilityActivationPointWithActivationPointAndIsEnabled?: Readonly<{
        activationPoint: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing';
        isEnabled: boolean;
    }>;
    accessibilityActivationPointWithUnitPoint?: SDKAccessibilityActivationPointWithUnitPoint;
    accessibilityAddTraits?: SDKAccessibilityAddTraits;
    accessibilityDirectTouch?: Readonly<{
        isDirectTouchArea: boolean;
        options: 'silentOnTouch' | 'requiresActivation';
    }>;
    accessibilityDragPointWithPointAndDescription?: Readonly<{
        point: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing';
        description: string;
    }>;
    accessibilityDragPointWithPointAndDescriptionAndIsEnabled?: Readonly<{
        point: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing';
        description: string;
        isEnabled: boolean;
    }>;
    accessibilityDropPointWithPointAndDescription?: Readonly<{
        point: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing';
        description: string;
    }>;
    accessibilityDropPointWithPointAndDescriptionAndIsEnabled?: Readonly<{
        point: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing';
        description: string;
        isEnabled: boolean;
    }>;
    accessibilityElement?: SDKAccessibilityElement;
    accessibilityHeading?: SDKAccessibilityHeading;
    accessibilityHiddenWithBool?: boolean;
    accessibilityHiddenWithHiddenAndIsEnabled?: Readonly<{
        hidden: boolean;
        isEnabled: boolean;
    }>;
    accessibilityHintWithHintAndIsEnabled?: Readonly<{
        hint: string;
        isEnabled: boolean;
    }>;
    accessibilityHintWithText?: string;
    accessibilityIdentifierWithIdentifierAndIsEnabled?: Readonly<{
        identifier: string;
        isEnabled: boolean;
    }>;
    accessibilityIdentifierWithString?: string;
    accessibilityIgnoresInvertColors?: boolean;
    accessibilityLabelWithLabelAndIsEnabled?: Readonly<{
        label: string;
        isEnabled: boolean;
    }>;
    accessibilityLabelWithText?: string;
    accessibilityRemoveTraits?: SDKAccessibilityRemoveTraits;
    accessibilityRespondsToUserInteractionWithBool?: boolean;
    accessibilityRespondsToUserInteractionWithRespondsToUserInteractionAndIsEnabled?: Readonly<{
        respondsToUserInteraction: boolean;
        isEnabled: boolean;
    }>;
    accessibilityScrollStatus?: Readonly<{
        status: string;
        isEnabled: boolean;
    }>;
    accessibilityShowsLargeContentViewer?: boolean;
    accessibilitySortPriority?: number;
    accessibilityTextContentType?: SDKAccessibilityTextContentType;
    accessibilityValueWithText?: string;
    accessibilityValueWithValueDescriptionAndIsEnabled?: Readonly<{
        valueDescription: string;
        isEnabled: boolean;
    }>;
    accessibilityWithActivationPoint?: SDKAccessibilityWithActivationPoint;
    accessibilityWithAddTraits?: SDKAccessibilityWithAddTraits;
    accessibilityWithHidden?: boolean;
    accessibilityWithHint?: string;
    accessibilityWithIdentifier?: string;
    accessibilityWithLabel?: string;
    accessibilityWithRemoveTraits?: SDKAccessibilityWithRemoveTraits;
    accessibilityWithSortPriority?: number;
    accessibilityWithValue?: string;
    addPassToWalletButtonStyle?: SDKAddPassToWalletButtonStyle;
    allowedDynamicRange?: SDKAllowedDynamicRange | null;
    allowsHitTesting?: boolean;
    allowsTightening?: boolean;
    allowsWindowActivationEventsWithNoArguments?: boolean;
    allowsWindowActivationEventsWithOptionalBool?: boolean | null;
    animation?: SDKAnimation | null;
    aspectRatio?: Readonly<{
        aspectRatio: number | null;
        contentMode: 'fit' | 'fill';
    }>;
    assistiveAccessNavigationIcon?: string;
    autocorrectionDisabled?: boolean;
    backgroundExtensionEffectWithIsEnabled?: boolean;
    backgroundExtensionEffectWithNoArguments?: boolean;
    backgroundStyle?: SDKBackgroundStyle;
    badgeProminence?: SDKBadgeProminence;
    badgeWithInt?: number;
    badgeWithOptionalText?: string | null;
    baselineOffset?: number;
    blendMode?: SDKBlendMode;
    blur?: Readonly<{
        radius: number;
        opaque: boolean;
    }>;
    bold?: boolean;
    brightness?: number;
    buttonBorderShape?: SDKButtonBorderShape;
    buttonRepeatBehavior?: SDKButtonRepeatBehavior;
    buttonSizing?: SDKButtonSizing;
    buttonStyle?: SDKButtonStyle;
    clipped?: boolean;
    colorInvert?: boolean;
    colorMultiply?: SDKColorMultiply;
    colorScheme?: SDKColorScheme;
    compositingGroup?: boolean;
    containerCornerOffset?: Readonly<{
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
        sizeToFit: boolean;
    }>;
    containerRelativeFrameWithAxesAndAlignment?: Readonly<{
        axes: 'horizontal' | 'vertical';
        alignment: 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing' | 'centerFirstTextBaseline' | 'centerLastTextBaseline' | 'leadingFirstTextBaseline' | 'leadingLastTextBaseline' | 'trailingFirstTextBaseline' | 'trailingLastTextBaseline';
    }>;
    containerRelativeFrameWithAxesAndCountAndSpanAndSpacingAndAlignment?: Readonly<{
        axes: 'horizontal' | 'vertical';
        count: number;
        span: number;
        spacing: number;
        alignment: 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing' | 'centerFirstTextBaseline' | 'centerLastTextBaseline' | 'leadingFirstTextBaseline' | 'leadingLastTextBaseline' | 'trailingFirstTextBaseline' | 'trailingLastTextBaseline';
    }>;
    contentMarginsWithEdgesAndLengthAndPlacement?: Readonly<{
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
        length: number | null;
        placement: 'automatic' | 'scrollContent' | 'scrollIndicators';
    }>;
    contentMarginsWithLengthAndPlacement?: Readonly<{
        length: number;
        placement: 'automatic' | 'scrollContent' | 'scrollIndicators';
    }>;
    contentTransition?: SDKContentTransition;
    contrast?: number;
    controlGroupStyle?: SDKControlGroupStyle;
    controlSize?: SDKControlSize;
    coordinateSpace?: string;
    datePickerStyle?: SDKDatePickerStyle;
    defaultAdaptableTabBarPlacement?: SDKDefaultAdaptableTabBarPlacement;
    defaultHoverEffect?: SDKDefaultHoverEffect | null;
    defaultScrollAnchorWithAnchorAndRole?: Readonly<{
        anchor: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing' | null;
        role: 'initialOffset' | 'sizeChanges' | 'alignment';
    }>;
    defaultScrollAnchorWithOptionalUnitPoint?: SDKDefaultScrollAnchorWithOptionalUnitPoint | null;
    defaultTabBarPlacement?: SDKDefaultTabBarPlacement;
    defersSystemGestures?: SDKDefersSystemGestures;
    deleteDisabled?: boolean;
    dialogSuppressionToggle?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    disableAutocorrection?: boolean | null;
    disabled?: boolean;
    disclosureGroupStyle?: SDKDisclosureGroupStyle;
    documentLaunchSubtitle?: string;
    documentLaunchTitle?: string;
    drawingGroup?: Readonly<{
        opaque: boolean;
        colorMode: 'nonLinear' | 'linear' | 'extendedLinear';
    }>;
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
    fixedSizeWithHorizontalAndVertical?: Readonly<{
        horizontal: boolean;
        vertical: boolean;
    }>;
    fixedSizeWithNoArguments?: boolean;
    flipsForRightToLeftLayoutDirection?: boolean;
    focusableWithBool?: boolean;
    focusableWithIsFocusableAndInteractions?: Readonly<{
        isFocusable: boolean;
        interactions: 'activate' | 'edit' | 'automatic';
    }>;
    focusEffectDisabled?: boolean;
    fontWidth?: SDKFontWidth | null;
    foregroundColor?: SDKForegroundColor | null;
    formStyle?: SDKFormStyle;
    gaugeStyle?: SDKGaugeStyle;
    geometryGroup?: boolean;
    glassEffectTransition?: SDKGlassEffectTransition;
    grayscale?: number;
    gridCellAnchor?: SDKGridCellAnchor;
    gridCellColumns?: number;
    gridCellUnsizedAxes?: SDKGridCellUnsizedAxes;
    gridColumnAlignment?: SDKGridColumnAlignment;
    groupBoxStyle?: SDKGroupBoxStyle;
    handGestureShortcut?: Readonly<{
        shortcut: 'primaryAction';
        isEnabled: boolean;
    }>;
    headerProminence?: SDKHeaderProminence;
    help?: string;
    hidden?: boolean;
    hoverEffectDisabled?: boolean;
    hoverEffectWithEffectAndIsEnabled?: Readonly<{
        effect: 'automatic' | 'highlight' | 'lift';
        isEnabled: boolean;
    }>;
    hoverEffectWithHoverEffect?: SDKHoverEffectWithHoverEffect;
    hueRotation?: SDKHueRotation;
    id?: string;
    ignoresSafeAreaWithRegionsAndEdges?: Readonly<{
        regions: 'container' | 'keyboard' | 'all';
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
    }>;
    ignoresSafeAreaWithRegionsAndEdgesAndAlignment?: Readonly<{
        regions: 'container' | 'keyboard' | 'all';
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
        alignment: 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing' | 'centerFirstTextBaseline' | 'centerLastTextBaseline' | 'leadingFirstTextBaseline' | 'leadingLastTextBaseline' | 'trailingFirstTextBaseline' | 'trailingLastTextBaseline' | null;
    }>;
    imageScale?: SDKImageScale;
    indexViewStyle?: SDKIndexViewStyle;
    inspectorColumnWidthWithCGFloat?: number;
    inspectorColumnWidthWithMinAndIdealAndMax?: Readonly<{
        min: number | null;
        ideal: number;
        max: number | null;
    }>;
    interactionActivityTrackingTag?: string;
    interactiveDismissDisabled?: boolean;
    invalidatableContent?: boolean;
    italic?: boolean;
    kerning?: number;
    keyboardShortcutWithKeyAndModifiers?: Readonly<{
        key: 'upArrow' | 'downArrow' | 'leftArrow' | 'rightArrow' | 'escape' | 'delete' | 'deleteForward' | 'home' | 'end' | 'pageUp' | 'pageDown' | 'clear' | 'tab' | 'space' | 'return';
        modifiers: 'capsLock' | 'shift' | 'control' | 'option' | 'command' | 'numericPad' | 'function' | 'all';
    }>;
    keyboardShortcutWithKeyAndModifiersAndLocalization?: Readonly<{
        key: 'upArrow' | 'downArrow' | 'leftArrow' | 'rightArrow' | 'escape' | 'delete' | 'deleteForward' | 'home' | 'end' | 'pageUp' | 'pageDown' | 'clear' | 'tab' | 'space' | 'return';
        modifiers: 'capsLock' | 'shift' | 'control' | 'option' | 'command' | 'numericPad' | 'function' | 'all';
        localization: 'automatic' | 'withoutMirroring' | 'custom';
    }>;
    keyboardShortcutWithKeyboardShortcut?: SDKKeyboardShortcutWithKeyboardShortcut;
    keyboardShortcutWithOptionalKeyboardShortcut?: SDKKeyboardShortcutWithOptionalKeyboardShortcut | null;
    labeledContentStyle?: SDKLabeledContentStyle;
    labelIconToTitleSpacing?: number;
    labelReservedIconWidth?: number;
    labelsHidden?: boolean;
    labelStyle?: SDKLabelStyle;
    labelsVisibility?: SDKLabelsVisibility;
    layoutDirectionBehavior?: SDKLayoutDirectionBehavior;
    layoutPriority?: number;
    lineLimitWithLimitAndReservesSpace?: Readonly<{
        limit: number;
        reservesSpace: boolean;
    }>;
    lineLimitWithOptionalInt?: number | null;
    lineSpacing?: number;
    listItemTintWithOptionalColor?: SDKListItemTintWithOptionalColor | null;
    listItemTintWithOptionalListItemTint?: SDKListItemTintWithOptionalListItemTint | null;
    listRowInsets?: Readonly<{
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
        length: number | null;
    }>;
    listRowSeparator?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        edges: 'top' | 'bottom' | 'all';
    }>;
    listRowSeparatorTint?: Readonly<{
        color: 'accentColor' | 'red' | 'orange' | 'yellow' | 'green' | 'mint' | 'teal' | 'cyan' | 'blue' | 'indigo' | 'purple' | 'pink' | 'brown' | 'white' | 'gray' | 'black' | 'clear' | 'primary' | 'secondary' | null;
        edges: 'top' | 'bottom' | 'all';
    }>;
    listRowSpacing?: number | null;
    listSectionIndexVisibility?: SDKListSectionIndexVisibility;
    listSectionMargins?: Readonly<{
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
        length: number | null;
    }>;
    listSectionSeparator?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        edges: 'top' | 'bottom' | 'all';
    }>;
    listSectionSeparatorTint?: Readonly<{
        color: 'accentColor' | 'red' | 'orange' | 'yellow' | 'green' | 'mint' | 'teal' | 'cyan' | 'blue' | 'indigo' | 'purple' | 'pink' | 'brown' | 'white' | 'gray' | 'black' | 'clear' | 'primary' | 'secondary' | null;
        edges: 'top' | 'bottom' | 'all';
    }>;
    listSectionSpacingWithCGFloat?: number;
    listSectionSpacingWithListSectionSpacing?: SDKListSectionSpacingWithListSectionSpacing;
    listStyle?: SDKListStyle;
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
    menuStyle?: SDKMenuStyle;
    minimumScaleFactor?: number;
    monospaced?: boolean;
    monospacedDigit?: boolean;
    moveDisabled?: boolean;
    multilineTextAlignmentWithStrategy?: SDKMultilineTextAlignmentWithStrategy;
    multilineTextAlignmentWithTextAlignment?: SDKMultilineTextAlignmentWithTextAlignment;
    musicSubscriptionOffer?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    navigationBarBackButtonHidden?: boolean;
    navigationBarHidden?: boolean;
    navigationBarTitleDisplayMode?: SDKNavigationBarTitleDisplayMode;
    navigationBarTitleWithText?: string;
    navigationBarTitleWithTitleAndDisplayMode?: Readonly<{
        title: string;
        displayMode: 'automatic' | 'inline' | 'large';
    }>;
    navigationLinkIndicatorVisibility?: SDKNavigationLinkIndicatorVisibility;
    navigationSplitViewColumnWidthWithCGFloat?: number;
    navigationSplitViewColumnWidthWithMinAndIdealAndMax?: Readonly<{
        min: number | null;
        ideal: number;
        max: number | null;
    }>;
    navigationSplitViewStyle?: SDKNavigationSplitViewStyle;
    navigationSubtitle?: string;
    navigationTitleWithBindingString?: Readonly<{
        value: string;
        onChange: (value: string) => void;
    }>;
    navigationTitleWithText?: string;
    navigationViewStyle?: SDKNavigationViewStyle;
    offerCodeRedemption?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    offset?: Readonly<{
        x: number;
        y: number;
    }>;
    onAppear?: () => void;
    onDisappear?: () => void;
    onHover?: (value: boolean) => void;
    onInteractiveResizeChange?: (value: boolean) => void;
    onLongPressGestureWithPerform?: () => void;
    onLongPressGestureWithPerformFromSwiftUI?: () => void;
    onLongPressGestureWithPerformFromSwiftUIVariant?: () => void;
    onMapCameraChange?: () => void;
    onOpenURLWithPerform?: (value: string) => void;
    onOpenURLWithPrefersInApp?: boolean;
    onScrollVisibilityChange?: (value: boolean) => void;
    onSubmit?: () => void;
    onTapGesture?: () => void;
    paletteSelectionEffect?: SDKPaletteSelectionEffect;
    payLaterViewAction?: SDKPayLaterViewAction;
    payLaterViewDisplayStyle?: SDKPayLaterViewDisplayStyle;
    payWithApplePayButtonDisableCardArt?: boolean;
    payWithApplePayButtonStyle?: SDKPayWithApplePayButtonStyle;
    persistentSystemOverlays?: SDKPersistentSystemOverlays;
    photosPickerAccessoryVisibility?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
    }>;
    photosPickerSearchText?: string | null;
    photosPickerStyle?: SDKPhotosPickerStyle;
    pickerStyle?: SDKPickerStyle;
    position?: Readonly<{
        x: number;
        y: number;
    }>;
    preferredColorScheme?: SDKPreferredColorScheme | null;
    presentationBackground?: SDKPresentationBackground;
    presentationBackgroundInteraction?: SDKPresentationBackgroundInteraction;
    presentationCompactAdaptationWithHorizontalAdaptationAndVerticalAdaptation?: Readonly<{
        horizontalAdaptation: 'automatic' | 'none' | 'popover' | 'sheet' | 'fullScreenCover';
        verticalAdaptation: 'automatic' | 'none' | 'popover' | 'sheet' | 'fullScreenCover';
    }>;
    presentationCompactAdaptationWithPresentationAdaptation?: SDKPresentationCompactAdaptationWithPresentationAdaptation;
    presentationContentInteraction?: SDKPresentationContentInteraction;
    presentationCornerRadius?: number | null;
    presentationDragIndicator?: SDKPresentationDragIndicator;
    presentationPlacement?: SDKPresentationPlacement;
    previewDisplayName?: string | null;
    previewInterfaceOrientation?: SDKPreviewInterfaceOrientation;
    privacySensitive?: boolean;
    productDescription?: SDKProductDescription;
    productIconBorder?: boolean;
    progressViewStyle?: SDKProgressViewStyle;
    realityViewLayoutBehavior?: SDKRealityViewLayoutBehavior;
    redacted?: SDKRedacted;
    renameAction?: () => void;
    replaceDisabled?: boolean;
    rotationEffect?: Readonly<{
        angle: 'zero';
        anchor: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing';
    }>;
    safeAreaPaddingWithCGFloat?: number;
    safeAreaPaddingWithEdgesAndLength?: Readonly<{
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
        length: number | null;
    }>;
    saturation?: number;
    scaledToFill?: boolean;
    scaledToFit?: boolean;
    scaleEffectWithSAndAnchor?: Readonly<{
        s: number;
        anchor: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing';
    }>;
    scaleEffectWithXAndYAndAnchor?: Readonly<{
        x: number;
        y: number;
        anchor: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing';
    }>;
    scenePaddingWithPaddingAndEdges?: Readonly<{
        padding: 'minimum';
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
    }>;
    scenePaddingWithSet?: SDKScenePaddingWithSet;
    scrollBounceBehavior?: Readonly<{
        behavior: 'automatic' | 'always' | 'basedOnSize';
        axes: 'horizontal' | 'vertical';
    }>;
    scrollClipDisabled?: boolean;
    scrollContentBackground?: SDKScrollContentBackground;
    scrollDisabled?: boolean;
    scrollDismissesKeyboard?: SDKScrollDismissesKeyboard;
    scrollEdgeEffectHidden?: Readonly<{
        hidden: boolean;
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
    }>;
    scrollEdgeEffectStyle?: Readonly<{
        style: 'automatic' | 'hard' | 'soft' | null;
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
    }>;
    scrollIndicators?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden' | 'never';
        axes: 'horizontal' | 'vertical';
    }>;
    scrollIndicatorsFlash?: boolean;
    scrollTargetLayout?: boolean;
    searchable?: Readonly<{
        value: string;
        onChange: (value: string) => void;
    }>;
    searchCompletion?: string;
    searchDictationBehavior?: SDKSearchDictationBehavior;
    searchPresentationToolbarBehavior?: SDKSearchPresentationToolbarBehavior;
    searchSuggestions?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        placements: 'menu' | 'content';
    }>;
    searchToolbarBehavior?: SDKSearchToolbarBehavior;
    sectionIndexLabel?: string | null;
    selectionDisabled?: boolean;
    shadow?: Readonly<{
        color: 'accentColor' | 'red' | 'orange' | 'yellow' | 'green' | 'mint' | 'teal' | 'cyan' | 'blue' | 'indigo' | 'purple' | 'pink' | 'brown' | 'white' | 'gray' | 'black' | 'clear' | 'primary' | 'secondary';
        radius: number;
        x: number;
        y: number;
    }>;
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
    storeButton?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        buttonKinds: 'restorePurchases' | 'cancellation' | 'redeemCode' | 'signIn' | 'policies';
    }>;
    strikethrough?: Readonly<{
        isActive: boolean;
        pattern: 'solid' | 'dot' | 'dash' | 'dashDot' | 'dashDotDot';
        color: 'accentColor' | 'red' | 'orange' | 'yellow' | 'green' | 'mint' | 'teal' | 'cyan' | 'blue' | 'indigo' | 'purple' | 'pink' | 'brown' | 'white' | 'gray' | 'black' | 'clear' | 'primary' | 'secondary' | null;
    }>;
    submitLabel?: SDKSubmitLabel;
    submitScope?: boolean;
    subscriptionOfferViewButtonVisibility?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        buttonKinds: 'detailLink';
    }>;
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
    tableStyle?: SDKTableStyle;
    tabViewSearchActivation?: SDKTabViewSearchActivation;
    tabViewStyle?: SDKTabViewStyle;
    tag?: string;
    textCase?: SDKTextCase | null;
    textFieldStyle?: SDKTextFieldStyle;
    textInputAutocapitalization?: SDKTextInputAutocapitalization | null;
    textInputBorderShape?: SDKTextInputBorderShape;
    textInputFormattingControlVisibility?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        placement: 'contextMenu' | 'inputAssistant' | 'all' | 'default';
    }>;
    textScale?: Readonly<{
        scale: 'default' | 'secondary';
        isEnabled: boolean;
    }>;
    textSelection?: SDKTextSelection;
    textSelectionAffinity?: SDKTextSelectionAffinity;
    toggleStyle?: SDKToggleStyle;
    toolbarBackground?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        bars: 'automatic' | 'bottomBar' | 'navigationBar' | 'tabBar' | 'statusBar';
    }>;
    toolbarBackgroundVisibility?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        bars: 'automatic' | 'bottomBar' | 'navigationBar' | 'tabBar' | 'statusBar';
    }>;
    toolbarColorScheme?: Readonly<{
        colorScheme: 'light' | 'dark' | null;
        bars: 'automatic' | 'bottomBar' | 'navigationBar' | 'tabBar' | 'statusBar';
    }>;
    toolbarMinimizationBehavior?: Readonly<{
        behavior: 'automatic' | 'onScrollDown' | 'onScrollUp' | 'never';
        bars: 'automatic' | 'bottomBar' | 'navigationBar' | 'tabBar' | 'statusBar';
    }>;
    toolbarMinimizationRestoration?: Readonly<{
        restoration: 'automatic' | 'atScrollEdge';
        bars: 'automatic' | 'bottomBar' | 'navigationBar' | 'tabBar' | 'statusBar';
    }>;
    toolbarMinimizationSafeAreaAdjustment?: Readonly<{
        adjustment: 'automatic' | 'enabled' | 'disabled';
        bars: 'automatic' | 'bottomBar' | 'navigationBar' | 'tabBar' | 'statusBar';
    }>;
    toolbarRole?: SDKToolbarRole;
    toolbarTitleDisplayMode?: SDKToolbarTitleDisplayMode;
    toolbarVisibility?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        bars: 'automatic' | 'bottomBar' | 'navigationBar' | 'tabBar' | 'statusBar';
    }>;
    toolbarWithRemoving?: SDKToolbarWithRemoving | null;
    toolbarWithVisibilityAndBars?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        bars: 'automatic' | 'bottomBar' | 'navigationBar' | 'tabBar' | 'statusBar';
    }>;
    tracking?: number;
    transition?: SDKTransition;
    truncationMode?: SDKTruncationMode;
    typeSelectEquivalent?: string | null;
    typesettingLanguage?: Readonly<{
        language: 'automatic';
        isEnabled: boolean;
    }>;
    underline?: Readonly<{
        isActive: boolean;
        pattern: 'solid' | 'dot' | 'dash' | 'dashDot' | 'dashDotDot';
        color: 'accentColor' | 'red' | 'orange' | 'yellow' | 'green' | 'mint' | 'teal' | 'cyan' | 'blue' | 'indigo' | 'purple' | 'pink' | 'brown' | 'white' | 'gray' | 'black' | 'clear' | 'primary' | 'secondary' | null;
    }>;
    unredacted?: boolean;
    verifyIdentityWithWalletButtonStyle?: SDKVerifyIdentityWithWalletButtonStyle;
    webViewBackForwardNavigationGestures?: SDKWebViewBackForwardNavigationGestures;
    webViewContentBackground?: SDKWebViewContentBackground;
    webViewElementFullscreenBehavior?: SDKWebViewElementFullscreenBehavior;
    webViewLinkPreviews?: SDKWebViewLinkPreviews;
    webViewMagnificationGestures?: SDKWebViewMagnificationGestures;
    webViewTextSelection?: SDKWebViewTextSelection;
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