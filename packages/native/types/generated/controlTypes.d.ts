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
export declare const sdkAccessibilityAdjustableActionValues: readonly ['increment', 'decrement'];
export type SDKAccessibilityAdjustableAction = (typeof sdkAccessibilityAdjustableActionValues)[number];
export declare const sdkAccessibilityElementValues: readonly ['ignore', 'contain', 'combine'];
export type SDKAccessibilityElement = (typeof sdkAccessibilityElementValues)[number];
export declare const sdkAccessibilityHeadingValues: readonly ['unspecified', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
export type SDKAccessibilityHeading = (typeof sdkAccessibilityHeadingValues)[number];
export declare const sdkAccessibilityRemoveTraitsValues: readonly ['isButton', 'isHeader', 'isSelected', 'isLink', 'isSearchField', 'isImage', 'playsSound', 'isKeyboardKey', 'isStaticText', 'isSummaryElement', 'updatesFrequently', 'startsMediaSession', 'allowsDirectInteraction', 'causesPageTurn', 'isModal', 'isToggle', 'isTabBar'];
export type SDKAccessibilityRemoveTraits = (typeof sdkAccessibilityRemoveTraitsValues)[number];
export declare const sdkAccessibilityScrollActionValues: readonly ['top', 'leading', 'bottom', 'trailing'];
export type SDKAccessibilityScrollAction = (typeof sdkAccessibilityScrollActionValues)[number];
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
export declare const sdkAsyncImageURLSessionValues: readonly ['shared'];
export type SDKAsyncImageURLSession = (typeof sdkAsyncImageURLSessionValues)[number];
export declare const sdkAutocapitalizationValues: readonly ['allCharacters', 'none', 'sentences', 'words'];
export type SDKAutocapitalization = (typeof sdkAutocapitalizationValues)[number];
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
export declare const sdkClipShapeValues: readonly ['buttonBorder', 'rect', 'capsule', 'ellipse', 'circle', 'containerRelative', 'textInputBorder'];
export type SDKClipShape = (typeof sdkClipShapeValues)[number];
export declare const sdkColorMultiplyValues: readonly ['accentColor', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'primary', 'secondary'];
export type SDKColorMultiply = (typeof sdkColorMultiplyValues)[number];
export declare const sdkColorSchemeValues: readonly ['light', 'dark'];
export type SDKColorScheme = (typeof sdkColorSchemeValues)[number];
export declare const sdkContainerShapeValues: readonly ['buttonBorder', 'rect', 'capsule', 'ellipse', 'circle', 'containerRelative', 'textInputBorder'];
export type SDKContainerShape = (typeof sdkContainerShapeValues)[number];
export declare const sdkContentShapeValues: readonly ['buttonBorder', 'rect', 'capsule', 'ellipse', 'circle', 'containerRelative', 'textInputBorder'];
export type SDKContentShape = (typeof sdkContentShapeValues)[number];
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
export declare const sdkDefaultAppStorageValues: readonly ['standard'];
export type SDKDefaultAppStorage = (typeof sdkDefaultAppStorageValues)[number];
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
export declare const sdkDropConfigurationValues: readonly ['cancel', 'forbidden', 'copy', 'move'];
export type SDKDropConfiguration = (typeof sdkDropConfigurationValues)[number];
export declare const sdkDynamicTypeSizeValues: readonly ['xSmall', 'small', 'medium', 'large', 'xLarge', 'xxLarge', 'xxxLarge', 'accessibility1', 'accessibility2', 'accessibility3', 'accessibility4', 'accessibility5'];
export type SDKDynamicTypeSize = (typeof sdkDynamicTypeSizeValues)[number];
export declare const sdkEdgesIgnoringSafeAreaValues: readonly ['top', 'leading', 'bottom', 'trailing', 'all', 'horizontal', 'vertical'];
export type SDKEdgesIgnoringSafeArea = (typeof sdkEdgesIgnoringSafeAreaValues)[number];
export declare const sdkEnvironmentAllowedDynamicRangeValues: readonly ['standard', 'constrainedHigh', 'high'];
export type SDKEnvironmentAllowedDynamicRange = (typeof sdkEnvironmentAllowedDynamicRangeValues)[number];
export declare const sdkEnvironmentBackgroundMaterialValues: readonly ['regular', 'thick', 'thin', 'ultraThin', 'ultraThick', 'bar'];
export type SDKEnvironmentBackgroundMaterial = (typeof sdkEnvironmentBackgroundMaterialValues)[number];
export declare const sdkEnvironmentBackgroundProminenceValues: readonly ['standard', 'increased'];
export type SDKEnvironmentBackgroundProminence = (typeof sdkEnvironmentBackgroundProminenceValues)[number];
export declare const sdkEnvironmentBadgeProminenceValues: readonly ['decreased', 'standard', 'increased'];
export type SDKEnvironmentBadgeProminence = (typeof sdkEnvironmentBadgeProminenceValues)[number];
export declare const sdkEnvironmentCalendarValues: readonly ['autoupdatingCurrent', 'current'];
export type SDKEnvironmentCalendar = (typeof sdkEnvironmentCalendarValues)[number];
export declare const sdkEnvironmentColorSchemeValues: readonly ['light', 'dark'];
export type SDKEnvironmentColorScheme = (typeof sdkEnvironmentColorSchemeValues)[number];
export declare const sdkEnvironmentContentTransitionValues: readonly ['symbolEffect', 'identity', 'opacity', 'interpolate'];
export type SDKEnvironmentContentTransition = (typeof sdkEnvironmentContentTransitionValues)[number];
export declare const sdkEnvironmentControlSizeValues: readonly ['mini', 'small', 'regular', 'large', 'extraLarge'];
export type SDKEnvironmentControlSize = (typeof sdkEnvironmentControlSizeValues)[number];
export declare const sdkEnvironmentDynamicTypeSizeValues: readonly ['xSmall', 'small', 'medium', 'large', 'xLarge', 'xxLarge', 'xxxLarge', 'accessibility1', 'accessibility2', 'accessibility3', 'accessibility4', 'accessibility5'];
export type SDKEnvironmentDynamicTypeSize = (typeof sdkEnvironmentDynamicTypeSizeValues)[number];
export declare const sdkEnvironmentFontValues: readonly ['largeTitle', 'title', 'title2', 'title3', 'headline', 'subheadline', 'body', 'callout', 'footnote', 'caption', 'caption2', 'default'];
export type SDKEnvironmentFont = (typeof sdkEnvironmentFontValues)[number];
export declare const sdkEnvironmentHeaderProminenceValues: readonly ['standard', 'increased'];
export type SDKEnvironmentHeaderProminence = (typeof sdkEnvironmentHeaderProminenceValues)[number];
export declare const sdkEnvironmentHorizontalScrollBounceBehaviorValues: readonly ['automatic', 'always', 'basedOnSize'];
export type SDKEnvironmentHorizontalScrollBounceBehavior = (typeof sdkEnvironmentHorizontalScrollBounceBehaviorValues)[number];
export declare const sdkEnvironmentHorizontalScrollIndicatorVisibilityValues: readonly ['automatic', 'visible', 'hidden', 'never'];
export type SDKEnvironmentHorizontalScrollIndicatorVisibility = (typeof sdkEnvironmentHorizontalScrollIndicatorVisibilityValues)[number];
export declare const sdkEnvironmentHorizontalSizeClassValues: readonly ['compact', 'regular'];
export type SDKEnvironmentHorizontalSizeClass = (typeof sdkEnvironmentHorizontalSizeClassValues)[number];
export declare const sdkEnvironmentImageScaleValues: readonly ['small', 'medium', 'large'];
export type SDKEnvironmentImageScale = (typeof sdkEnvironmentImageScaleValues)[number];
export declare const sdkEnvironmentLabelsVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKEnvironmentLabelsVisibility = (typeof sdkEnvironmentLabelsVisibilityValues)[number];
export declare const sdkEnvironmentLayoutDirectionValues: readonly ['leftToRight', 'rightToLeft'];
export type SDKEnvironmentLayoutDirection = (typeof sdkEnvironmentLayoutDirectionValues)[number];
export declare const sdkEnvironmentLegibilityWeightValues: readonly ['regular', 'bold'];
export type SDKEnvironmentLegibilityWeight = (typeof sdkEnvironmentLegibilityWeightValues)[number];
export declare const sdkEnvironmentLineHeightValues: readonly ['variable', 'normal', 'tight', 'loose'];
export type SDKEnvironmentLineHeight = (typeof sdkEnvironmentLineHeightValues)[number];
export declare const sdkEnvironmentLocaleValues: readonly ['autoupdatingCurrent', 'current'];
export type SDKEnvironmentLocale = (typeof sdkEnvironmentLocaleValues)[number];
export declare const sdkEnvironmentMaterialActiveAppearanceValues: readonly ['automatic', 'active', 'matchWindow'];
export type SDKEnvironmentMaterialActiveAppearance = (typeof sdkEnvironmentMaterialActiveAppearanceValues)[number];
export declare const sdkEnvironmentMenuIndicatorVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKEnvironmentMenuIndicatorVisibility = (typeof sdkEnvironmentMenuIndicatorVisibilityValues)[number];
export declare const sdkEnvironmentMenuOrderValues: readonly ['automatic', 'priority', 'fixed'];
export type SDKEnvironmentMenuOrder = (typeof sdkEnvironmentMenuOrderValues)[number];
export declare const sdkEnvironmentMultilineTextAlignmentValues: readonly ['leading', 'center', 'trailing'];
export type SDKEnvironmentMultilineTextAlignment = (typeof sdkEnvironmentMultilineTextAlignmentValues)[number];
export declare const sdkEnvironmentRealityViewCameraControlsValues: readonly ['dolly', 'none', 'orbit', 'pan', 'tilt'];
export type SDKEnvironmentRealityViewCameraControls = (typeof sdkEnvironmentRealityViewCameraControlsValues)[number];
export declare const sdkEnvironmentRedactionReasonsValues: readonly ['placeholder', 'privacy', 'invalidated'];
export type SDKEnvironmentRedactionReasons = (typeof sdkEnvironmentRedactionReasonsValues)[number];
export declare const sdkEnvironmentScenePhaseValues: readonly ['background', 'inactive', 'active'];
export type SDKEnvironmentScenePhase = (typeof sdkEnvironmentScenePhaseValues)[number];
export declare const sdkEnvironmentScrollDismissesKeyboardModeValues: readonly ['automatic', 'immediately', 'interactively', 'never'];
export type SDKEnvironmentScrollDismissesKeyboardMode = (typeof sdkEnvironmentScrollDismissesKeyboardModeValues)[number];
export declare const sdkEnvironmentSidebarRowSizeValues: readonly ['small', 'medium', 'large'];
export type SDKEnvironmentSidebarRowSize = (typeof sdkEnvironmentSidebarRowSizeValues)[number];
export declare const sdkEnvironmentSizeCategoryValues: readonly ['extraSmall', 'small', 'medium', 'large', 'extraLarge', 'extraExtraLarge', 'extraExtraExtraLarge', 'accessibilityMedium', 'accessibilityLarge', 'accessibilityExtraLarge', 'accessibilityExtraExtraLarge', 'accessibilityExtraExtraExtraLarge'];
export type SDKEnvironmentSizeCategory = (typeof sdkEnvironmentSizeCategoryValues)[number];
export declare const sdkEnvironmentSymbolColorRenderingModeValues: readonly ['flat', 'gradient'];
export type SDKEnvironmentSymbolColorRenderingMode = (typeof sdkEnvironmentSymbolColorRenderingModeValues)[number];
export declare const sdkEnvironmentSymbolRenderingModeValues: readonly ['monochrome', 'multicolor', 'hierarchical', 'palette'];
export type SDKEnvironmentSymbolRenderingMode = (typeof sdkEnvironmentSymbolRenderingModeValues)[number];
export declare const sdkEnvironmentSymbolVariableValueModeValues: readonly ['color', 'draw'];
export type SDKEnvironmentSymbolVariableValueMode = (typeof sdkEnvironmentSymbolVariableValueModeValues)[number];
export declare const sdkEnvironmentSymbolVariantsValues: readonly ['none', 'circle', 'square', 'rectangle', 'fill', 'slash'];
export type SDKEnvironmentSymbolVariants = (typeof sdkEnvironmentSymbolVariantsValues)[number];
export declare const sdkEnvironmentTextCaseValues: readonly ['uppercase', 'lowercase'];
export type SDKEnvironmentTextCase = (typeof sdkEnvironmentTextCaseValues)[number];
export declare const sdkEnvironmentTextSelectionAffinityValues: readonly ['automatic', 'upstream', 'downstream'];
export type SDKEnvironmentTextSelectionAffinity = (typeof sdkEnvironmentTextSelectionAffinityValues)[number];
export declare const sdkEnvironmentTimeZoneValues: readonly ['autoupdatingCurrent', 'current', 'gmt'];
export type SDKEnvironmentTimeZone = (typeof sdkEnvironmentTimeZoneValues)[number];
export declare const sdkEnvironmentTruncationModeValues: readonly ['head', 'tail', 'middle'];
export type SDKEnvironmentTruncationMode = (typeof sdkEnvironmentTruncationModeValues)[number];
export declare const sdkEnvironmentVerticalScrollBounceBehaviorValues: readonly ['automatic', 'always', 'basedOnSize'];
export type SDKEnvironmentVerticalScrollBounceBehavior = (typeof sdkEnvironmentVerticalScrollBounceBehaviorValues)[number];
export declare const sdkEnvironmentVerticalScrollIndicatorVisibilityValues: readonly ['automatic', 'visible', 'hidden', 'never'];
export type SDKEnvironmentVerticalScrollIndicatorVisibility = (typeof sdkEnvironmentVerticalScrollIndicatorVisibilityValues)[number];
export declare const sdkEnvironmentVerticalSizeClassValues: readonly ['compact', 'regular'];
export type SDKEnvironmentVerticalSizeClass = (typeof sdkEnvironmentVerticalSizeClassValues)[number];
export declare const sdkFileDialogBrowserOptionsValues: readonly ['enumeratePackages', 'includeHiddenFiles', 'displayFileExtensions'];
export type SDKFileDialogBrowserOptions = (typeof sdkFileDialogBrowserOptionsValues)[number];
export declare const sdkFontValues: readonly ['largeTitle', 'title', 'title2', 'title3', 'headline', 'subheadline', 'body', 'callout', 'footnote', 'caption', 'caption2', 'default'];
export type SDKFont = (typeof sdkFontValues)[number];
export declare const sdkFontDesignWithOptionalDesignValues: readonly ['default', 'serif', 'rounded', 'monospaced'];
export type SDKFontDesignWithOptionalDesign = (typeof sdkFontDesignWithOptionalDesignValues)[number];
export declare const sdkFontWeightWithOptionalWeightValues: readonly ['ultraLight', 'thin', 'light', 'regular', 'medium', 'semibold', 'bold', 'heavy', 'black'];
export type SDKFontWeightWithOptionalWeight = (typeof sdkFontWeightWithOptionalWeightValues)[number];
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
export declare const sdkHandlesGameControllerEventsValues: readonly ['gamepad'];
export type SDKHandlesGameControllerEvents = (typeof sdkHandlesGameControllerEventsValues)[number];
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
export declare const sdkKeyboardTypeValues: readonly ['URL', 'alphabet', 'asciiCapable', 'asciiCapableNumberPad', 'decimalPad', 'default', 'emailAddress', 'namePhonePad', 'numberPad', 'numbersAndPunctuation', 'phonePad', 'twitter', 'webSearch'];
export type SDKKeyboardType = (typeof sdkKeyboardTypeValues)[number];
export declare const sdkLabeledContentStyleValues: readonly ['automatic'];
export type SDKLabeledContentStyle = (typeof sdkLabeledContentStyleValues)[number];
export declare const sdkLabelStyleValues: readonly ['automatic', 'iconOnly', 'titleAndIcon', 'titleOnly'];
export type SDKLabelStyle = (typeof sdkLabelStyleValues)[number];
export declare const sdkLabelsVisibilityValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKLabelsVisibility = (typeof sdkLabelsVisibilityValues)[number];
export declare const sdkLayoutDirectionBehaviorValues: readonly ['fixed', 'mirrors'];
export type SDKLayoutDirectionBehavior = (typeof sdkLayoutDirectionBehaviorValues)[number];
export declare const sdkLineHeightValues: readonly ['variable', 'normal', 'tight', 'loose'];
export type SDKLineHeight = (typeof sdkLineHeightValues)[number];
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
export declare const sdkNavigationTransitionValues: readonly ['automatic', 'crossFade'];
export type SDKNavigationTransition = (typeof sdkNavigationTransitionValues)[number];
export declare const sdkNavigationViewStyleValues: readonly ['columns', 'automatic', 'stack'];
export type SDKNavigationViewStyle = (typeof sdkNavigationViewStyleValues)[number];
export declare const sdkOnKeyPressValues: readonly ['handled', 'ignored'];
export type SDKOnKeyPress = (typeof sdkOnKeyPressValues)[number];
export declare const sdkOnScrollPhaseChangeValues: readonly ['idle', 'tracking', 'interacting', 'decelerating', 'animating'];
export type SDKOnScrollPhaseChange = (typeof sdkOnScrollPhaseChangeValues)[number];
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
export declare const sdkPhotosPickerDisabledCapabilitiesValues: readonly ['collectionNavigation', 'search', 'selectionActions', 'sensitivityAnalysisIntervention', 'stagingArea'];
export type SDKPhotosPickerDisabledCapabilities = (typeof sdkPhotosPickerDisabledCapabilitiesValues)[number];
export declare const sdkPhotosPickerMetadataOptionsValues: readonly ['removeCaptions', 'removeLocation'];
export type SDKPhotosPickerMetadataOptions = (typeof sdkPhotosPickerMetadataOptionsValues)[number];
export declare const sdkPhotosPickerStyleValues: readonly ['presentation', 'inline', 'compact'];
export type SDKPhotosPickerStyle = (typeof sdkPhotosPickerStyleValues)[number];
export declare const sdkPickerStyleValues: readonly ['wheel', 'inline', 'automatic', 'segmented', 'tabs', 'palette', 'navigationLink', 'menu'];
export type SDKPickerStyle = (typeof sdkPickerStyleValues)[number];
export declare const sdkPreferencePreferredColorSchemeValues: readonly ['light', 'dark'];
export type SDKPreferencePreferredColorScheme = (typeof sdkPreferencePreferredColorSchemeValues)[number];
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
export declare const sdkPresentationDetentsValues: readonly ['medium', 'large'];
export type SDKPresentationDetents = (typeof sdkPresentationDetentsValues)[number];
export declare const sdkPresentationDragIndicatorValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKPresentationDragIndicator = (typeof sdkPresentationDragIndicatorValues)[number];
export declare const sdkPresentationPlacementValues: readonly ['automatic', 'leading', 'center', 'trailing'];
export type SDKPresentationPlacement = (typeof sdkPresentationPlacementValues)[number];
export declare const sdkPresentationSizingValues: readonly ['form', 'page', 'fitted', 'automatic'];
export type SDKPresentationSizing = (typeof sdkPresentationSizingValues)[number];
export declare const sdkPreviewInterfaceOrientationValues: readonly ['portrait', 'portraitUpsideDown', 'landscapeLeft', 'landscapeRight'];
export type SDKPreviewInterfaceOrientation = (typeof sdkPreviewInterfaceOrientationValues)[number];
export declare const sdkPreviewLayoutValues: readonly ['device', 'sizeThatFits'];
export type SDKPreviewLayout = (typeof sdkPreviewLayoutValues)[number];
export declare const sdkProductDescriptionValues: readonly ['automatic', 'visible', 'hidden'];
export type SDKProductDescription = (typeof sdkProductDescriptionValues)[number];
export declare const sdkProductViewStyleValues: readonly ['automatic', 'regular', 'large', 'compact'];
export type SDKProductViewStyle = (typeof sdkProductViewStyleValues)[number];
export declare const sdkProgressViewStyleValues: readonly ['linear', 'circular', 'automatic'];
export type SDKProgressViewStyle = (typeof sdkProgressViewStyleValues)[number];
export declare const sdkRealityViewCameraControlsValues: readonly ['dolly', 'none', 'orbit', 'pan', 'tilt'];
export type SDKRealityViewCameraControls = (typeof sdkRealityViewCameraControlsValues)[number];
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
export declare const sdkScrollTargetBehaviorValues: readonly ['paging', 'viewAligned'];
export type SDKScrollTargetBehavior = (typeof sdkScrollTargetBehaviorValues)[number];
export declare const sdkScrollTransitionValues: readonly ['opacity', 'scaleEffect'];
export type SDKScrollTransition = (typeof sdkScrollTransitionValues)[number];
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
export declare const sdkSubscriptionOfferViewStyleValues: readonly ['automatic', 'compact'];
export type SDKSubscriptionOfferViewStyle = (typeof sdkSubscriptionOfferViewStyleValues)[number];
export declare const sdkSubscriptionStoreButtonLabelValues: readonly ['automatic', 'singleLine', 'multiline', 'action', 'displayName', 'price'];
export type SDKSubscriptionStoreButtonLabel = (typeof sdkSubscriptionStoreButtonLabelValues)[number];
export declare const sdkSubscriptionStoreControlBackgroundValues: readonly ['automatic', 'gradientMaterial', 'gradientMaterialOnScroll'];
export type SDKSubscriptionStoreControlBackground = (typeof sdkSubscriptionStoreControlBackgroundValues)[number];
export declare const sdkSubscriptionStoreControlStyleValues: readonly ['pagedProminentPicker', 'pagedPicker', 'automatic', 'compactPicker', 'prominentPicker', 'picker', 'buttons'];
export type SDKSubscriptionStoreControlStyle = (typeof sdkSubscriptionStoreControlStyleValues)[number];
export declare const sdkSubscriptionStoreOptionGroupStyleValues: readonly ['automatic', 'tabs', 'links'];
export type SDKSubscriptionStoreOptionGroupStyle = (typeof sdkSubscriptionStoreOptionGroupStyleValues)[number];
export declare const sdkSubscriptionStorePickerItemBackgroundValues: readonly ['placeholder', 'link', 'selection', 'windowBackground', 'fill', 'regularMaterial', 'thickMaterial', 'thinMaterial', 'ultraThinMaterial', 'ultraThickMaterial', 'bar', 'primary', 'secondary', 'tertiary', 'quaternary', 'quinary', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'separator', 'background', 'foreground', 'tint'];
export type SDKSubscriptionStorePickerItemBackground = (typeof sdkSubscriptionStorePickerItemBackgroundValues)[number];
export declare const sdkSubscriptionStorePolicyForegroundStyleValues: readonly ['placeholder', 'link', 'selection', 'windowBackground', 'fill', 'regularMaterial', 'thickMaterial', 'thinMaterial', 'ultraThinMaterial', 'ultraThickMaterial', 'bar', 'primary', 'secondary', 'tertiary', 'quaternary', 'quinary', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'separator', 'background', 'foreground', 'tint'];
export type SDKSubscriptionStorePolicyForegroundStyle = (typeof sdkSubscriptionStorePolicyForegroundStyleValues)[number];
export declare const sdkSymbolColorRenderingModeValues: readonly ['flat', 'gradient'];
export type SDKSymbolColorRenderingMode = (typeof sdkSymbolColorRenderingModeValues)[number];
export declare const sdkSymbolEffectValues: readonly ['pulse', 'bounce', 'variableColor', 'scale', 'wiggle', 'rotate', 'breathe'];
export type SDKSymbolEffect = (typeof sdkSymbolEffectValues)[number];
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
export declare const sdkTextContentTypeValues: readonly ['URL', 'addressCity', 'addressCityAndState', 'addressState', 'birthdate', 'birthdateDay', 'birthdateMonth', 'birthdateYear', 'cellularEID', 'cellularIMEI', 'cellularIMEI1', 'cellularIMEI2', 'cellularNAL', 'countryName', 'creditCardExpiration', 'creditCardExpirationMonth', 'creditCardExpirationYear', 'creditCardFamilyName', 'creditCardGivenName', 'creditCardMiddleName', 'creditCardName', 'creditCardNumber', 'creditCardSecurityCode', 'creditCardType', 'dateTime', 'emailAddress', 'familyName', 'flightNumber', 'fullStreetAddress', 'givenName', 'jobTitle', 'location', 'middleName', 'name', 'namePrefix', 'nameSuffix', 'newPassword', 'nickname', 'oneTimeCode', 'organizationName', 'password', 'postalCode', 'shipmentTrackingNumber', 'streetAddressLine1', 'streetAddressLine2', 'sublocality', 'telephoneNumber', 'username'];
export type SDKTextContentType = (typeof sdkTextContentTypeValues)[number];
export declare const sdkTextEditorStyleValues: readonly ['automatic', 'plain'];
export type SDKTextEditorStyle = (typeof sdkTextEditorStyleValues)[number];
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
export declare const sdkTintWithOptionalColorValues: readonly ['accentColor', 'red', 'orange', 'yellow', 'green', 'mint', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'brown', 'white', 'gray', 'black', 'clear', 'primary', 'secondary'];
export type SDKTintWithOptionalColor = (typeof sdkTintWithOptionalColorValues)[number];
export declare const sdkToggleStyleValues: readonly ['button', 'automatic', 'switch'];
export type SDKToggleStyle = (typeof sdkToggleStyleValues)[number];
export declare const sdkToolbarRoleValues: readonly ['automatic', 'navigationStack', 'browser', 'editor'];
export type SDKToolbarRole = (typeof sdkToolbarRoleValues)[number];
export declare const sdkToolbarTitleDisplayModeValues: readonly ['automatic', 'large', 'inlineLarge', 'inline'];
export type SDKToolbarTitleDisplayMode = (typeof sdkToolbarTitleDisplayModeValues)[number];
export declare const sdkToolbarWithRemovingValues: readonly ['sidebarToggle', 'title', 'search'];
export type SDKToolbarWithRemoving = (typeof sdkToolbarWithRemovingValues)[number];
export declare const sdkTransformPreferencePreferredColorSchemeValues: readonly ['light', 'dark'];
export type SDKTransformPreferencePreferredColorScheme = (typeof sdkTransformPreferencePreferredColorSchemeValues)[number];
export declare const sdkTransitionValues: readonly ['opacity', 'slide', 'identity', 'scale'];
export type SDKTransition = (typeof sdkTransitionValues)[number];
export declare const sdkTruncationModeValues: readonly ['head', 'tail', 'middle'];
export type SDKTruncationMode = (typeof sdkTruncationModeValues)[number];
export declare const sdkVerifyIdentityWithWalletButtonStyleValues: readonly ['black', 'blackOutline'];
export type SDKVerifyIdentityWithWalletButtonStyle = (typeof sdkVerifyIdentityWithWalletButtonStyleValues)[number];
export declare const sdkVisualEffectValues: readonly ['opacity', 'scaleEffect'];
export type SDKVisualEffect = (typeof sdkVisualEffectValues)[number];
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
    accessibilityAdjustableAction?: (value: 'increment' | 'decrement') => void;
    accessibilityCustomContent?: Readonly<{
        label: string;
        value: string;
    }>;
    accessibilityDefaultFocus?: boolean;
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
    accessibilityFocused?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
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
    accessibilityInputLabels?: Readonly<{
        inputLabels: readonly string[];
        isEnabled: boolean;
    }>;
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
    accessibilityScrollAction?: (value: 'top' | 'leading' | 'bottom' | 'trailing') => void;
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
    accessibilityZoomAction?: (value: {
        direction: 'zoomIn' | 'zoomOut';
        location: {
            x: number;
            y: number;
        };
        point: {
            x: number;
            y: number;
        };
    }) => void;
    addPassToWalletButtonStyle?: SDKAddPassToWalletButtonStyle;
    alignmentGuideWithHorizontalAlignment?: Readonly<{
        g: 'leading' | 'center' | 'trailing' | 'listRowSeparatorLeading' | 'listRowSeparatorTrailing';
        computeValue: number;
    }>;
    alignmentGuideWithVerticalAlignment?: Readonly<{
        g: 'top' | 'center' | 'bottom' | 'firstTextBaseline' | 'lastTextBaseline';
        computeValue: number;
    }>;
    allowedDynamicRange?: SDKAllowedDynamicRange | null;
    allowsHitTesting?: boolean;
    allowsTightening?: boolean;
    allowsWindowActivationEventsWithNoArguments?: boolean;
    allowsWindowActivationEventsWithOptionalBool?: boolean | null;
    animation?: SDKAnimation | null;
    appEntityIdentifier?: string | null;
    appStoreMerchandising?: Readonly<{
        isPresented: Readonly<{
            value: boolean;
            onChange: (value: boolean) => void;
        }>;
        kind: string;
    }>;
    aspectRatio?: Readonly<{
        aspectRatio: number | null;
        contentMode: 'fit' | 'fill';
    }>;
    assistiveAccessNavigationIconWithImage?: string;
    assistiveAccessNavigationIconWithSystemImage?: string;
    asyncImageURLSession?: SDKAsyncImageURLSession;
    autocapitalization?: SDKAutocapitalization;
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
    clipShape?: SDKClipShape;
    colorEffect?: Readonly<{
        shader: string;
        isEnabled: boolean;
    }>;
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
    containerShape?: SDKContainerShape;
    contentMarginsWithEdgesAndLengthAndPlacement?: Readonly<{
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
        length: number | null;
        placement: 'automatic' | 'scrollContent' | 'scrollIndicators';
    }>;
    contentMarginsWithLengthAndPlacement?: Readonly<{
        length: number;
        placement: 'automatic' | 'scrollContent' | 'scrollIndicators';
    }>;
    contentShape?: SDKContentShape;
    contentTransition?: SDKContentTransition;
    contrast?: number;
    controlGroupStyle?: SDKControlGroupStyle;
    controlSize?: SDKControlSize;
    coordinateSpace?: string;
    copyable?: Readonly<{
        payload: readonly string[];
    }>;
    cornerRadiusWithRadiusAndAntialiased?: Readonly<{
        radius: number;
        antialiased: boolean;
    }>;
    currentEntitlementTask?: Readonly<{
        productID: string;
        onAction: (value: {
            case: 'loading';
            values: readonly [];
        } | {
            case: 'failure';
            values: readonly [string];
        } | {
            case: 'success';
            values: readonly [
                {
                    case: 'verified';
                    jwsRepresentation: string;
                    error: null;
                } | {
                    case: 'unverified';
                    jwsRepresentation: string;
                    error: string;
                } | null
            ];
        } | {
            case: 'unknown';
            values: readonly [];
        }) => void | Promise<void>;
    }>;
    cuttable?: Readonly<{
        items: readonly string[];
        onAction: () => void;
    }>;
    dataDetection?: boolean;
    datePickerStyle?: SDKDatePickerStyle;
    defaultAdaptableTabBarPlacement?: SDKDefaultAdaptableTabBarPlacement;
    defaultAppStorage?: SDKDefaultAppStorage;
    defaultFocus?: boolean;
    defaultHoverEffect?: SDKDefaultHoverEffect | null;
    defaultScrollAnchorWithAnchorAndRole?: Readonly<{
        anchor: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing' | null;
        role: 'initialOffset' | 'sizeChanges' | 'alignment';
    }>;
    defaultScrollAnchorWithOptionalUnitPoint?: SDKDefaultScrollAnchorWithOptionalUnitPoint | null;
    defaultTabBarPlacement?: SDKDefaultTabBarPlacement;
    defersSystemGestures?: SDKDefersSystemGestures;
    deleteDisabled?: boolean;
    dialogIcon?: string | null;
    dialogSuppressionToggle?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    dialogSuppressionToggleWithLabelAndIsSuppressed?: Readonly<{
        label: string;
        isSuppressed: Readonly<{
            value: boolean;
            onChange: (value: boolean) => void;
        }>;
    }>;
    disableAutocorrection?: boolean | null;
    disabled?: boolean;
    disclosureGroupStyle?: SDKDisclosureGroupStyle;
    distortionEffect?: Readonly<{
        shader: string;
        maxSampleOffset: Readonly<{
            width: number;
            height: number;
        }>;
        isEnabled: boolean;
    }>;
    documentLaunchSubtitle?: string;
    documentLaunchTitle?: string;
    dragConfiguration?: boolean;
    draggable?: Readonly<{
        payload: string;
    }>;
    drawingGroup?: Readonly<{
        opaque: boolean;
        colorMode: 'nonLinear' | 'linear' | 'extendedLinear';
    }>;
    dropConfiguration?: Readonly<{
        result: 'cancel' | 'forbidden' | 'copy' | 'move';
        onAction: (value: {
            itemsCount: number;
            suggestedOperations: {
                rawValue: number;
            };
            size: {
                width: number;
                height: number;
            };
            location: {
                x: number;
                y: number;
            };
        }) => void;
    }>;
    dropDestination?: (value: {
        items: readonly string[];
        session: {
            itemsCount: number;
            suggestedOperations: {
                rawValue: number;
            };
            size: {
                width: number;
                height: number;
            };
            location: {
                x: number;
                y: number;
            };
        };
    }) => void;
    dynamicTypeSize?: SDKDynamicTypeSize;
    edgesIgnoringSafeArea?: SDKEdgesIgnoringSafeArea;
    environmentAccessibilityEnabled?: boolean;
    environmentAccessibilityPrefersCrossFadeTransitions?: boolean;
    environmentAllowedDynamicRange?: SDKEnvironmentAllowedDynamicRange | null;
    environmentAllowsTightening?: boolean;
    environmentAppearsActive?: boolean;
    environmentAutocorrectionDisabled?: boolean;
    environmentBackgroundMaterial?: SDKEnvironmentBackgroundMaterial | null;
    environmentBackgroundProminence?: SDKEnvironmentBackgroundProminence;
    environmentBadgeProminence?: SDKEnvironmentBadgeProminence;
    environmentCalendar?: SDKEnvironmentCalendar;
    environmentColorScheme?: SDKEnvironmentColorScheme;
    environmentContentTransition?: SDKEnvironmentContentTransition;
    environmentContentTransitionAddsDrawingGroup?: boolean;
    environmentControlSize?: SDKEnvironmentControlSize;
    environmentDefaultMinListHeaderHeight?: number | null;
    environmentDefaultMinListRowHeight?: number;
    environmentDisableAutocorrection?: boolean | null;
    environmentDisplayScale?: number;
    environmentDynamicTypeSize?: SDKEnvironmentDynamicTypeSize;
    environmentFont?: SDKEnvironmentFont | null;
    environmentHeaderProminence?: SDKEnvironmentHeaderProminence;
    environmentHorizontalScrollBounceBehavior?: SDKEnvironmentHorizontalScrollBounceBehavior;
    environmentHorizontalScrollIndicatorVisibility?: SDKEnvironmentHorizontalScrollIndicatorVisibility;
    environmentHorizontalSizeClass?: SDKEnvironmentHorizontalSizeClass | null;
    environmentImageScale?: SDKEnvironmentImageScale;
    environmentIsEnabled?: boolean;
    environmentIsFocusEffectEnabled?: boolean;
    environmentIsHoverEffectEnabled?: boolean;
    environmentIsLuminanceReduced?: boolean;
    environmentIsSceneCaptured?: boolean;
    environmentIsScrollEnabled?: boolean;
    environmentLabelsVisibility?: SDKEnvironmentLabelsVisibility;
    environmentLayoutDirection?: SDKEnvironmentLayoutDirection;
    environmentLegibilityWeight?: SDKEnvironmentLegibilityWeight | null;
    environmentLineHeight?: SDKEnvironmentLineHeight | null;
    environmentLineLimit?: number | null;
    environmentLineSpacing?: number;
    environmentLocale?: SDKEnvironmentLocale;
    environmentMaterialActiveAppearance?: SDKEnvironmentMaterialActiveAppearance;
    environmentMenuIndicatorVisibility?: SDKEnvironmentMenuIndicatorVisibility;
    environmentMenuOrder?: SDKEnvironmentMenuOrder;
    environmentMinimumScaleFactor?: number;
    environmentMultilineTextAlignment?: SDKEnvironmentMultilineTextAlignment;
    environmentRealityViewCameraControls?: SDKEnvironmentRealityViewCameraControls;
    environmentRedactionReasons?: SDKEnvironmentRedactionReasons;
    environmentScenePhase?: SDKEnvironmentScenePhase;
    environmentScrollDismissesKeyboardMode?: SDKEnvironmentScrollDismissesKeyboardMode;
    environmentSidebarRowSize?: SDKEnvironmentSidebarRowSize;
    environmentSizeCategory?: SDKEnvironmentSizeCategory;
    environmentSymbolColorRenderingMode?: SDKEnvironmentSymbolColorRenderingMode | null;
    environmentSymbolRenderingMode?: SDKEnvironmentSymbolRenderingMode | null;
    environmentSymbolVariableValueMode?: SDKEnvironmentSymbolVariableValueMode | null;
    environmentSymbolVariants?: SDKEnvironmentSymbolVariants;
    environmentSystemPrefersReducedResourceUsage?: boolean;
    environmentTextCase?: SDKEnvironmentTextCase | null;
    environmentTextSelectionAffinity?: SDKEnvironmentTextSelectionAffinity;
    environmentTimeZone?: SDKEnvironmentTimeZone;
    environmentTruncationMode?: SDKEnvironmentTruncationMode;
    environmentVerticalScrollBounceBehavior?: SDKEnvironmentVerticalScrollBounceBehavior;
    environmentVerticalScrollIndicatorVisibility?: SDKEnvironmentVerticalScrollIndicatorVisibility;
    environmentVerticalSizeClass?: SDKEnvironmentVerticalSizeClass | null;
    fileDialogBrowserOptions?: SDKFileDialogBrowserOptions;
    fileDialogConfirmationLabel?: string | null;
    fileDialogCustomizationID?: string;
    fileDialogDefaultDirectory?: string | null;
    fileDialogImportsUnresolvedAliases?: boolean;
    fileDialogMessage?: string | null;
    fileDialogURLEnabled?: boolean;
    fileExporter?: Readonly<{
        isPresented: Readonly<{
            value: boolean;
            onChange: (value: boolean) => void;
        }>;
        item: string | null;
        onCompletion: (result: Readonly<{
            success: string;
        } | {
            failure: string;
        }>) => void;
    }>;
    fileExporterFilenameLabel?: string | null;
    fileImporterWithIsPresentedAndAllowedContentTypesAndAllowsMultipleSelectionAndOnCompletion?: Readonly<{
        isPresented: Readonly<{
            value: boolean;
            onChange: (value: boolean) => void;
        }>;
        allowedContentTypes: readonly string[];
        allowsMultipleSelection: boolean;
        onCompletion: (result: Readonly<{
            success: readonly string[];
        } | {
            failure: string;
        }>) => void;
    }>;
    fileImporterWithIsPresentedAndAllowedContentTypesAndOnCompletion?: Readonly<{
        isPresented: Readonly<{
            value: boolean;
            onChange: (value: boolean) => void;
        }>;
        allowedContentTypes: readonly string[];
        onCompletion: (result: Readonly<{
            success: string;
        } | {
            failure: string;
        }>) => void;
    }>;
    fileMover?: Readonly<{
        isPresented: Readonly<{
            value: boolean;
            onChange: (value: boolean) => void;
        }>;
        file: string | null;
        onCompletion: (result: Readonly<{
            success: string;
        } | {
            failure: string;
        }>) => void;
    }>;
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
    focused?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    focusEffectDisabled?: boolean;
    font?: SDKFont | null;
    fontDesignWithOptionalDesign?: SDKFontDesignWithOptionalDesign | null;
    fontWeightWithOptionalWeight?: SDKFontWeightWithOptionalWeight | null;
    fontWidth?: SDKFontWidth | null;
    foregroundColor?: SDKForegroundColor | null;
    formStyle?: SDKFormStyle;
    frameWithMinWidthAndIdealWidthAndMaxWidthAndMinHeightAndIdealHeightAndMaxHeightAndAlignment?: Readonly<{
        minWidth: number | null;
        idealWidth: number | null;
        maxWidth: number | null;
        minHeight: number | null;
        idealHeight: number | null;
        maxHeight: number | null;
        alignment: 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing' | 'centerFirstTextBaseline' | 'centerLastTextBaseline' | 'leadingFirstTextBaseline' | 'leadingLastTextBaseline' | 'trailingFirstTextBaseline' | 'trailingLastTextBaseline';
    }>;
    frameWithNoArguments?: boolean;
    frameWithWidthAndHeightAndAlignment?: Readonly<{
        width: number | null;
        height: number | null;
        alignment: 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing' | 'centerFirstTextBaseline' | 'centerLastTextBaseline' | 'leadingFirstTextBaseline' | 'leadingLastTextBaseline' | 'trailingFirstTextBaseline' | 'trailingLastTextBaseline';
    }>;
    gaugeStyle?: SDKGaugeStyle;
    geometryGroup?: boolean;
    gesture?: Readonly<{
        kind: 'drag';
        onEnded: (value: {
            location: {
                x: number;
                y: number;
            };
            startLocation: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'longPress';
        onEnded: (value: boolean) => void;
    }> | Readonly<{
        kind: 'magnify';
        onEnded: (value: {
            magnification: number;
            velocity: number;
            startAnchor: {
                x: number;
                y: number;
            };
            startLocation: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'rotate';
        onEnded: (value: {
            rotation: {
                radians: number;
            };
            velocity: {
                radians: number;
            };
            startAnchor: {
                x: number;
                y: number;
            };
            startLocation: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'spatialTap';
        onEnded: (value: {
            location: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'tap';
        onEnded: () => void;
    }>;
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
    handlesExternalEvents?: Readonly<{
        preferring: readonly string[];
        allowing: readonly string[];
    }>;
    handlesGameControllerEvents?: SDKHandlesGameControllerEvents;
    headerProminence?: SDKHeaderProminence;
    help?: string;
    hidden?: boolean;
    highPriorityGesture?: Readonly<{
        kind: 'drag';
        onEnded: (value: {
            location: {
                x: number;
                y: number;
            };
            startLocation: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'longPress';
        onEnded: (value: boolean) => void;
    }> | Readonly<{
        kind: 'magnify';
        onEnded: (value: {
            magnification: number;
            velocity: number;
            startAnchor: {
                x: number;
                y: number;
            };
            startLocation: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'rotate';
        onEnded: (value: {
            rotation: {
                radians: number;
            };
            velocity: {
                radians: number;
            };
            startAnchor: {
                x: number;
                y: number;
            };
            startLocation: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'spatialTap';
        onEnded: (value: {
            location: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'tap';
        onEnded: () => void;
    }>;
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
    inAppPurchaseOptions?: Readonly<{
        quantity?: number;
        simulatesAskToBuyInSandbox?: boolean;
        introductoryOfferEligibility?: string;
    }>;
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
    itemProvider?: string;
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
    keyboardType?: SDKKeyboardType;
    labeledContentStyle?: SDKLabeledContentStyle;
    labelIconToTitleSpacing?: number;
    labelReservedIconWidth?: number;
    labelsHidden?: boolean;
    labelStyle?: SDKLabelStyle;
    labelsVisibility?: SDKLabelsVisibility;
    layerEffect?: Readonly<{
        shader: string;
        maxSampleOffset: Readonly<{
            width: number;
            height: number;
        }>;
        isEnabled: boolean;
    }>;
    layoutDirectionBehavior?: SDKLayoutDirectionBehavior;
    layoutPriority?: number;
    lineHeight?: SDKLineHeight | null;
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
    manageSubscriptionsSheetWithIsPresentedAndSubscriptionGroupID?: Readonly<{
        isPresented: Readonly<{
            value: boolean;
            onChange: (value: boolean) => void;
        }>;
        subscriptionGroupID: string;
    }>;
    mapControlVisibility?: SDKMapControlVisibility;
    mapFeatureSelectionAccessory?: SDKMapFeatureSelectionAccessory | null;
    mapFeatureSelectionDisabled?: boolean;
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
    navigationDocument?: string;
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
    navigationTransition?: SDKNavigationTransition;
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
    onCameraCaptureEvent?: (value: {
        phase: 'began' | 'cancelled' | 'ended' | 'unknown';
    }) => void;
    onCameraCaptureEventWithIsEnabledAndDefaultSoundDisabledAndPrimaryActionAndSecondaryAction?: Readonly<{
        isEnabled: boolean;
        defaultSoundDisabled: boolean;
        primaryAction: (value: {
            phase: 'began' | 'cancelled' | 'ended' | 'unknown';
            shouldPlaySound: boolean;
        }) => void;
        secondaryAction: (value: {
            phase: 'began' | 'cancelled' | 'ended' | 'unknown';
            shouldPlaySound: boolean;
        }) => void;
    }>;
    onCameraCaptureEventWithIsEnabledAndPrimaryActionAndSecondaryAction?: Readonly<{
        isEnabled: boolean;
        primaryAction: (value: {
            phase: 'began' | 'cancelled' | 'ended' | 'unknown';
        }) => void;
        secondaryAction: (value: {
            phase: 'began' | 'cancelled' | 'ended' | 'unknown';
        }) => void;
    }>;
    onChange?: Readonly<{
        value: string;
        onChange: (value: string) => void;
    }>;
    onContinueUserActivity?: Readonly<{
        activityType: string;
        action: (value: {
            activityType: string;
            isEligibleForHandoff: boolean;
            isEligibleForPrediction: boolean;
            isEligibleForPublicIndexing: boolean;
            isEligibleForSearch: boolean;
            needsSave: boolean;
            supportsContinuationStreams: boolean;
            targetContentIdentifier: string | null;
            title: string | null;
        }) => void;
    }>;
    onContinuousHover?: (value: {
        case: 'active';
        values: readonly [{
            x: number;
            y: number;
        }];
    } | {
        case: 'ended';
        values: readonly [];
    }) => void;
    onDisappear?: () => void;
    onDrag?: string;
    onDragSessionUpdated?: (value: {
        location: {
            x: number;
            y: number;
        };
    }) => void;
    onDropSessionUpdated?: (value: {
        itemsCount: number;
        suggestedOperations: {
            rawValue: number;
        };
        size: {
            width: number;
            height: number;
        };
        location: {
            x: number;
            y: number;
        };
    }) => void;
    onGeometryChangeWithSize?: (value: {
        oldValue: {
            width: number;
            height: number;
        };
        newValue: {
            width: number;
            height: number;
        };
    }) => void;
    onHover?: (value: boolean) => void;
    onInAppPurchaseCompletion?: (value: {
        value: {
            id: string;
            type: {
                rawValue: string;
            };
            displayName: string;
            description: string;
            displayPrice: string;
            isFamilyShareable: boolean;
        };
        result: {
            case: 'success';
            value: {
                case: 'success';
                values: readonly [
                    {
                        case: 'verified';
                        jwsRepresentation: string;
                        error: null;
                    } | {
                        case: 'unverified';
                        jwsRepresentation: string;
                        error: string;
                    }
                ];
            } | {
                case: 'userCancelled';
                values: readonly [];
            } | {
                case: 'pending';
                values: readonly [];
            } | {
                case: 'unknown';
                values: readonly [];
            };
        } | {
            case: 'failure';
            error: string;
        };
    }) => void | Promise<void>;
    onInAppPurchaseStart?: (value: {
        id: string;
        type: {
            rawValue: string;
        };
        displayName: string;
        description: string;
        displayPrice: string;
        isFamilyShareable: boolean;
    }) => void | Promise<void>;
    onInteractiveResizeChange?: (value: boolean) => void;
    onKeyPress?: Readonly<{
        result: 'handled' | 'ignored';
        onAction: (value: {
            characters: string;
            modifiers: {
                rawValue: number;
            };
        }) => void;
    }>;
    onLongPressGesture?: () => void;
    onMapCameraChange?: () => void;
    onMapCameraChangeWithEventStruct?: (value: {
        camera: {
            distance: number;
            heading: number;
            pitch: number;
        };
    }) => void;
    onOpenURLWithPerform?: (value: string) => void;
    onOpenURLWithPrefersInApp?: boolean;
    onPencilDoubleTap?: (value: {
        hoverPose: {
            location: {
                x: number;
                y: number;
            };
            anchor: {
                x: number;
                y: number;
            };
            zDistance: number;
            altitude: {
                radians: number;
            };
            azimuth: {
                radians: number;
            };
            roll: {
                radians: number;
            };
        } | null;
    }) => void;
    onPencilSqueeze?: (value: {
        case: 'active';
        values: readonly [
            {
                hoverPose: {
                    location: {
                        x: number;
                        y: number;
                    };
                    anchor: {
                        x: number;
                        y: number;
                    };
                    zDistance: number;
                    altitude: {
                        radians: number;
                    };
                    azimuth: {
                        radians: number;
                    };
                    roll: {
                        radians: number;
                    };
                } | null;
            }
        ];
    } | {
        case: 'ended';
        values: readonly [
            {
                hoverPose: {
                    location: {
                        x: number;
                        y: number;
                    };
                    anchor: {
                        x: number;
                        y: number;
                    };
                    zDistance: number;
                    altitude: {
                        radians: number;
                    };
                    azimuth: {
                        radians: number;
                    };
                    roll: {
                        radians: number;
                    };
                } | null;
            }
        ];
    } | {
        case: 'failed';
        values: readonly [];
    }) => void;
    onPreferenceChangePreferredColorScheme?: (value: 'light' | 'dark' | 'unknown' | null) => void;
    onScrollGeometryChangeWithContainerSize?: (value: {
        oldValue: {
            width: number;
            height: number;
        };
        newValue: {
            width: number;
            height: number;
        };
    }) => void;
    onScrollGeometryChangeWithContentOffset?: (value: {
        oldValue: {
            x: number;
            y: number;
        };
        newValue: {
            x: number;
            y: number;
        };
    }) => void;
    onScrollGeometryChangeWithContentSize?: (value: {
        oldValue: {
            width: number;
            height: number;
        };
        newValue: {
            width: number;
            height: number;
        };
    }) => void;
    onScrollPhaseChange?: (oldValue: 'idle' | 'tracking' | 'interacting' | 'decelerating' | 'animating', newValue: 'idle' | 'tracking' | 'interacting' | 'decelerating' | 'animating') => void;
    onScrollTargetVisibilityChange?: (value: readonly string[]) => void;
    onScrollVisibilityChange?: (value: boolean) => void;
    onSubmit?: () => void;
    onTapGestureWithPerform?: (value: {
        x: number;
        y: number;
    }) => void;
    onTapGestureWithPerformFromSwiftUICore?: () => void;
    paletteSelectionEffect?: SDKPaletteSelectionEffect;
    pasteDestination?: (value: readonly string[]) => void;
    payLaterViewAction?: SDKPayLaterViewAction;
    payLaterViewDisplayStyle?: SDKPayLaterViewDisplayStyle;
    payWithApplePayButtonDisableCardArt?: boolean;
    payWithApplePayButtonStyle?: SDKPayWithApplePayButtonStyle;
    persistentSystemOverlays?: SDKPersistentSystemOverlays;
    photosPickerAccessoryVisibility?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        edges: 'top' | 'leading' | 'bottom' | 'trailing' | 'all' | 'horizontal' | 'vertical';
    }>;
    photosPickerDisabledCapabilities?: SDKPhotosPickerDisabledCapabilities;
    photosPickerMetadataOptions?: SDKPhotosPickerMetadataOptions;
    photosPickerSearchText?: string | null;
    photosPickerStyle?: SDKPhotosPickerStyle;
    photosReferenceImageViewer?: Readonly<{
        fileURL: Readonly<{
            value: string | null;
            onChange: (value: string | null) => void;
        }>;
        onProcessingCompletion: (result: Readonly<{
            success: string;
        } | {
            failure: string;
        }>) => void;
    }>;
    pickerStyle?: SDKPickerStyle;
    position?: Readonly<{
        x: number;
        y: number;
    }>;
    preferencePreferredColorScheme?: SDKPreferencePreferredColorScheme | null;
    preferredColorScheme?: SDKPreferredColorScheme | null;
    preferredSubscriptionOffer?: string;
    presentationBackground?: SDKPresentationBackground;
    presentationBackgroundInteraction?: SDKPresentationBackgroundInteraction;
    presentationCompactAdaptationWithHorizontalAdaptationAndVerticalAdaptation?: Readonly<{
        horizontalAdaptation: 'automatic' | 'none' | 'popover' | 'sheet' | 'fullScreenCover';
        verticalAdaptation: 'automatic' | 'none' | 'popover' | 'sheet' | 'fullScreenCover';
    }>;
    presentationCompactAdaptationWithPresentationAdaptation?: SDKPresentationCompactAdaptationWithPresentationAdaptation;
    presentationContentInteraction?: SDKPresentationContentInteraction;
    presentationCornerRadius?: number | null;
    presentationDetents?: readonly SDKPresentationDetents[];
    presentationDragIndicator?: SDKPresentationDragIndicator;
    presentationPlacement?: SDKPresentationPlacement;
    presentationSizing?: SDKPresentationSizing;
    previewDevice?: string | null;
    previewDisplayName?: string | null;
    previewInterfaceOrientation?: SDKPreviewInterfaceOrientation;
    previewLayout?: SDKPreviewLayout;
    privacySensitive?: boolean;
    productDescription?: SDKProductDescription;
    productIconBorder?: boolean;
    productViewStyle?: SDKProductViewStyle;
    progressViewStyle?: SDKProgressViewStyle;
    projectionEffect?: Readonly<{
        transform: Readonly<{
            a: number;
            b: number;
            c: number;
            d: number;
            tx: number;
            ty: number;
        }>;
    }>;
    quickLookPreview?: Readonly<{
        value: string | null;
        onChange: (value: string | null) => void;
    }>;
    realityViewCameraControls?: SDKRealityViewCameraControls;
    realityViewLayoutBehavior?: SDKRealityViewLayoutBehavior;
    redacted?: SDKRedacted;
    refreshable?: () => void | Promise<void>;
    refundRequestSheet?: Readonly<{
        transactionID: string;
        isPresented: Readonly<{
            value: boolean;
            onChange: (value: boolean) => void;
        }>;
    }>;
    renameAction?: () => void;
    replaceDisabled?: boolean;
    rotation3DEffect?: Readonly<{
        angle: Readonly<{
            radians: number;
        }>;
        axis: Readonly<{
            x: number;
            y: number;
            z: number;
        }>;
        anchor: 'zero' | 'center' | 'leading' | 'trailing' | 'top' | 'bottom' | 'topLeading' | 'topTrailing' | 'bottomLeading' | 'bottomTrailing';
        anchorZ: number;
        perspective: number;
    }>;
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
    scrollPositionWithBindingPoint?: Readonly<{
        value: Readonly<{
            x: number;
            y: number;
        }> | null;
        onChange: (value: Readonly<{
            x: number;
            y: number;
        }> | null) => void;
    }>;
    scrollPositionWithId?: Readonly<{
        value: string | null;
        onChange: (value: string | null) => void;
    }>;
    scrollTargetBehavior?: SDKScrollTargetBehavior;
    scrollTargetLayout?: boolean;
    scrollTransition?: Readonly<{
        kind: 'opacity' | 'scaleEffect';
        value: number;
    }>;
    searchable?: Readonly<{
        value: string;
        onChange: (value: string) => void;
    }>;
    searchCompletion?: string;
    searchDictationBehavior?: SDKSearchDictationBehavior;
    searchFocused?: Readonly<{
        value: boolean;
        onChange: (value: boolean) => void;
    }>;
    searchPresentationToolbarBehavior?: SDKSearchPresentationToolbarBehavior;
    searchSuggestions?: Readonly<{
        visibility: 'automatic' | 'visible' | 'hidden';
        placements: 'menu' | 'content';
    }>;
    searchToolbarBehavior?: SDKSearchToolbarBehavior;
    sectionIndexLabel?: string | null;
    selectionDisabled?: boolean;
    sensoryFeedback?: Readonly<{
        feedback: 'success' | 'warning' | 'error' | 'selection' | 'increase' | 'decrease' | 'start' | 'stop' | 'alignment' | 'levelChange' | 'pathComplete' | 'impact';
        trigger: string;
    }>;
    shadow?: Readonly<{
        color: 'accentColor' | 'red' | 'orange' | 'yellow' | 'green' | 'mint' | 'teal' | 'cyan' | 'blue' | 'indigo' | 'purple' | 'pink' | 'brown' | 'white' | 'gray' | 'black' | 'clear' | 'primary' | 'secondary';
        radius: number;
        x: number;
        y: number;
    }>;
    shortcutsLinkStyle?: SDKShortcutsLinkStyle;
    signInWithAppleButtonStyle?: SDKSignInWithAppleButtonStyle;
    simultaneousGesture?: Readonly<{
        kind: 'drag';
        onEnded: (value: {
            location: {
                x: number;
                y: number;
            };
            startLocation: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'longPress';
        onEnded: (value: boolean) => void;
    }> | Readonly<{
        kind: 'magnify';
        onEnded: (value: {
            magnification: number;
            velocity: number;
            startAnchor: {
                x: number;
                y: number;
            };
            startLocation: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'rotate';
        onEnded: (value: {
            rotation: {
                radians: number;
            };
            velocity: {
                radians: number;
            };
            startAnchor: {
                x: number;
                y: number;
            };
            startLocation: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'spatialTap';
        onEnded: (value: {
            location: {
                x: number;
                y: number;
            };
        }) => void;
    }> | Readonly<{
        kind: 'tap';
        onEnded: () => void;
    }>;
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
    storeProductsTask?: Readonly<{
        ids: readonly string[];
        onAction: (value: {
            case: 'loading';
            values: readonly [];
        } | {
            case: 'failure';
            values: readonly [string];
        } | {
            case: 'success';
            values: readonly [
                readonly {
                    id: string;
                    type: {
                        rawValue: string;
                    };
                    displayName: string;
                    description: string;
                    displayPrice: string;
                    isFamilyShareable: boolean;
                }[],
                readonly string[]
            ];
        } | {
            case: 'unknown';
            values: readonly [];
        }) => void | Promise<void>;
    }>;
    storeProductTask?: Readonly<{
        id: string;
        onAction: (value: {
            case: 'loading';
            values: readonly [];
        } | {
            case: 'unavailable';
            values: readonly [];
        } | {
            case: 'failure';
            values: readonly [string];
        } | {
            case: 'success';
            values: readonly [
                {
                    id: string;
                    type: {
                        rawValue: string;
                    };
                    displayName: string;
                    description: string;
                    displayPrice: string;
                    isFamilyShareable: boolean;
                }
            ];
        } | {
            case: 'unknown';
            values: readonly [];
        }) => void | Promise<void>;
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
    subscriptionOfferViewDetailAction?: () => void;
    subscriptionOfferViewStyle?: SDKSubscriptionOfferViewStyle;
    subscriptionStatusTask?: Readonly<{
        groupID: string;
        onAction: (value: {
            case: 'loading';
            values: readonly [];
        } | {
            case: 'failure';
            values: readonly [string];
        } | {
            case: 'success';
            values: readonly [
                readonly {
                    state: {
                        rawValue: number;
                    };
                    transaction: {
                        case: 'verified';
                        jwsRepresentation: string;
                        error: null;
                    } | {
                        case: 'unverified';
                        jwsRepresentation: string;
                        error: string;
                    };
                    renewalInfo: {
                        case: 'verified';
                        jwsRepresentation: string;
                        error: null;
                    } | {
                        case: 'unverified';
                        jwsRepresentation: string;
                        error: string;
                    };
                }[]
            ];
        } | {
            case: 'unknown';
            values: readonly [];
        }) => void | Promise<void>;
    }>;
    subscriptionStoreButtonLabel?: SDKSubscriptionStoreButtonLabel;
    subscriptionStoreControlBackground?: SDKSubscriptionStoreControlBackground;
    subscriptionStoreControlStyle?: SDKSubscriptionStoreControlStyle;
    subscriptionStoreOptionGroupStyle?: SDKSubscriptionStoreOptionGroupStyle;
    subscriptionStorePickerItemBackground?: SDKSubscriptionStorePickerItemBackground;
    subscriptionStorePolicyDestination?: Readonly<{
        url: string;
        button: 'termsOfService' | 'privacyPolicy';
    }>;
    subscriptionStorePolicyForegroundStyle?: SDKSubscriptionStorePolicyForegroundStyle;
    subscriptionStoreSignInAction?: () => void;
    swipeActionsContainer?: boolean;
    symbolColorRenderingMode?: SDKSymbolColorRenderingMode | null;
    symbolEffect?: SDKSymbolEffect;
    symbolEffectsRemoved?: boolean;
    symbolRenderingMode?: SDKSymbolRenderingMode | null;
    symbolVariableValueMode?: SDKSymbolVariableValueMode | null;
    symbolVariant?: SDKSymbolVariant;
    tabBarMinimizeBehavior?: SDKTabBarMinimizeBehavior;
    tableColumnHeaders?: SDKTableColumnHeaders;
    tableStyle?: SDKTableStyle;
    tabViewCustomization?: Readonly<{
        value: string | null;
        onChange: (value: string) => void;
    }>;
    tabViewSearchActivation?: SDKTabViewSearchActivation;
    tabViewStyle?: SDKTabViewStyle;
    tag?: string;
    task?: () => void | Promise<void>;
    textCase?: SDKTextCase | null;
    textContentType?: SDKTextContentType | null;
    textEditorStyle?: SDKTextEditorStyle;
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
    tintWithOptionalColor?: SDKTintWithOptionalColor | null;
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
    transaction?: Readonly<{
        transform: Readonly<{
            isContinuous?: boolean;
            scrollPositionUpdatePreservesVelocity?: boolean;
            disablesAnimations?: boolean;
            tracksVelocity?: boolean;
        }>;
    }>;
    transformEffect?: Readonly<{
        transform: Readonly<{
            a: number;
            b: number;
            c: number;
            d: number;
            tx: number;
            ty: number;
        }>;
    }>;
    transformEnvironmentAccessibilityEnabled?: boolean;
    transformEnvironmentAccessibilityPrefersCrossFadeTransitions?: boolean;
    transformEnvironmentAllowsTightening?: boolean;
    transformEnvironmentAppearsActive?: boolean;
    transformEnvironmentAutocorrectionDisabled?: boolean;
    transformEnvironmentContentTransitionAddsDrawingGroup?: boolean;
    transformEnvironmentDefaultMinListRowHeight?: number;
    transformEnvironmentDisplayScale?: number;
    transformEnvironmentIsEnabled?: boolean;
    transformEnvironmentIsFocusEffectEnabled?: boolean;
    transformEnvironmentIsHoverEffectEnabled?: boolean;
    transformEnvironmentIsLuminanceReduced?: boolean;
    transformEnvironmentIsSceneCaptured?: boolean;
    transformEnvironmentIsScrollEnabled?: boolean;
    transformEnvironmentLineSpacing?: number;
    transformEnvironmentMinimumScaleFactor?: number;
    transformEnvironmentSystemPrefersReducedResourceUsage?: boolean;
    transformPreferencePreferredColorScheme?: SDKTransformPreferencePreferredColorScheme | null;
    transition?: SDKTransition;
    translationPresentation?: Readonly<{
        isPresented: Readonly<{
            value: boolean;
            onChange: (value: boolean) => void;
        }>;
        text: string;
    }>;
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
    userActivity?: Readonly<{
        activityType: string;
        isActive: boolean;
        update: Readonly<{
            isEligibleForHandoff?: boolean;
            isEligibleForPrediction?: boolean;
            isEligibleForPublicIndexing?: boolean;
            isEligibleForSearch?: boolean;
            needsSave?: boolean;
            supportsContinuationStreams?: boolean;
            targetContentIdentifier?: string | null;
            title?: string | null;
        }>;
    }>;
    verifyIdentityWithWalletButtonStyle?: SDKVerifyIdentityWithWalletButtonStyle;
    visualEffect?: Readonly<{
        kind: 'opacity' | 'scaleEffect';
        value: number;
    }>;
    webViewBackForwardNavigationGestures?: SDKWebViewBackForwardNavigationGestures;
    webViewContentBackground?: SDKWebViewContentBackground;
    webViewElementFullscreenBehavior?: SDKWebViewElementFullscreenBehavior;
    webViewLinkPreviews?: SDKWebViewLinkPreviews;
    webViewMagnificationGestures?: SDKWebViewMagnificationGestures;
    webViewOnScrollGeometryChangeWithContainerSize?: (value: {
        oldValue: {
            width: number;
            height: number;
        };
        newValue: {
            width: number;
            height: number;
        };
    }) => void;
    webViewOnScrollGeometryChangeWithContentOffset?: (value: {
        oldValue: {
            x: number;
            y: number;
        };
        newValue: {
            x: number;
            y: number;
        };
    }) => void;
    webViewOnScrollGeometryChangeWithContentSize?: (value: {
        oldValue: {
            width: number;
            height: number;
        };
        newValue: {
            width: number;
            height: number;
        };
    }) => void;
    webViewScrollPosition?: Readonly<{
        value: Readonly<{
            x: number;
            y: number;
        }> | null;
        onChange: (value: Readonly<{
            x: number;
            y: number;
        }> | null) => void;
    }>;
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