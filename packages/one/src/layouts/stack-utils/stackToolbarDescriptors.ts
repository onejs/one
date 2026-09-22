import type { ColorValue, ImageSourcePropType, StyleProp, TextStyle } from 'react-native'
import type {
  NativeStackHeaderItem,
  NativeStackHeaderItemMenuAction,
  NativeStackHeaderItemMenuSubmenu,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

/**
 * Expo-exact toolbar placement. Bottom is the navigation-controller toolbar
 * owned by the screen; left/right are header items owned by
 * react-native-screens. Default is bottom, as in Expo.
 */
export type StackToolbarPlacement = 'left' | 'right' | 'bottom'

export type StackToolbarVariant = 'plain' | 'done' | 'prominent'

export interface StackToolbarProps {
  children?: ReactNode
  placement?: StackToolbarPlacement
  /**
   * Left/right only. Renders children as a custom header element instead of
   * header items, as in Expo.
   */
  asChild?: boolean
}

export interface StackToolbarLabelProps {
  children?: string
}

export type StackToolbarIconProps =
  | {
      src: ImageSourcePropType
      renderingMode?: 'template' | 'original'
    }
  | {
      /** SF Symbol name. The only icon form the bottom bar takes. */
      sf: string
    }
  | {
      /** Xcode asset catalog image name. */
      xcasset: string
      renderingMode?: 'template' | 'original'
    }

export interface StackToolbarBadgeProps {
  children?: string
  style?: StyleProp<
    Pick<TextStyle, 'fontFamily' | 'fontSize' | 'color' | 'fontWeight' | 'backgroundColor'>
  >
}

export interface StackToolbarButtonProps {
  /**
   * Plain text, or Icon/Label/Badge primitives. Anything else throws in dev,
   * as in Expo.
   */
  children?: ReactNode
  /** SF Symbol name or image source. Bottom takes SF strings only. */
  icon?: string | ImageSourcePropType
  /** Custom image for bottom placement. */
  image?: ImageSourcePropType
  iconRenderingMode?: 'template' | 'original'
  variant?: StackToolbarVariant
  tintColor?: ColorValue
  /** Label text style. Maps to labelStyle/titleStyle. */
  style?: StyleProp<TextStyle>
  disabled?: boolean
  hidden?: boolean
  selected?: boolean
  hidesSharedBackground?: boolean
  /**
   * Separate this item's background from its neighbors. Default false, as in
   * Expo. Maps to sharesBackground = !separateBackground.
   */
  separateBackground?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
  onPress?: () => void
}

export interface StackToolbarMenuProps {
  /** Menu/MenuAction/Label/Icon/Badge. Anything else throws in dev. */
  children?: ReactNode
  /** Title shown on top of the menu. Optional, as in Expo. */
  title?: string
  icon?: string | ImageSourcePropType
  image?: ImageSourcePropType
  iconRenderingMode?: 'template' | 'original'
  variant?: StackToolbarVariant
  tintColor?: ColorValue
  style?: StyleProp<TextStyle>
  disabled?: boolean
  destructive?: boolean
  hidden?: boolean
  hidesSharedBackground?: boolean
  separateBackground?: boolean
  /** Submenus only. Maps to UIMenu.Options.displayInline. */
  inline?: boolean
  /** Submenus only. Maps to UIMenu.Options.displayAsPalette. */
  palette?: boolean
  /** Bottom only. Preferred size of the menu elements (iOS 16+). */
  elementSize?: 'auto' | 'small' | 'medium' | 'large'
  accessibilityLabel?: string
  accessibilityHint?: string
}

export interface StackToolbarMenuActionProps {
  /** Icon, Label, or string title. */
  children?: ReactNode
  icon?: string | ImageSourcePropType
  image?: ImageSourcePropType
  iconRenderingMode?: 'template' | 'original'
  disabled?: boolean
  destructive?: boolean
  hidden?: boolean
  /** Expo-exact name. Maps to keepsMenuPresented. */
  unstable_keepPresented?: boolean
  isOn?: boolean
  onPress?: () => void
  discoverabilityLabel?: string
  /** Maps to header action description, bottom action subtitle. */
  subtitle?: string
  accessibilityLabel?: string
  accessibilityHint?: string
}

export interface StackToolbarSpacerProps {
  hidden?: boolean
  /**
   * Fixed width. Required in left/right; without it the spacer is flexible
   * (bottom only).
   */
  width?: number
  /** Bottom only. Whether the spacer joins the shared glass background. */
  sharesBackground?: boolean
}

export interface StackToolbarSearchBarSlotProps {
  hidden?: boolean
  hidesSharedBackground?: boolean
  separateBackground?: boolean
}

/** Marker set on toolbar compound components to identify slots/leaf nodes. */
export const TOOLBAR_KIND = '__oneStackToolbarKind' as const

export type StackToolbarKind =
  | 'toolbar'
  | 'button'
  | 'menu'
  | 'menuAction'
  | 'spacer'
  | 'searchBarSlot'
  | 'label'
  | 'icon'
  | 'badge'

function kindOf(element: ReactNode): StackToolbarKind | undefined {
  if (!isValidElement(element)) return undefined
  return (element.type as { [TOOLBAR_KIND]?: StackToolbarKind })?.[TOOLBAR_KIND]
}

function isKind(element: ReactNode, kind: StackToolbarKind): boolean {
  return kindOf(element) === kind
}

function warn(message: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message)
  }
}

/** Safe display name for any child type, including fragments and host tags. */
function childName(child: ReactNode): string {
  if (!isValidElement(child)) return 'unknown'
  const type = child.type as { name?: string } | string | symbol
  if (typeof type === 'string') return type
  if (typeof type === 'symbol') return 'Fragment'
  return type?.name ?? 'unknown'
}

function fallbackIdentifier(slot: string, index: number, title?: string): string {
  const slug =
    (title ?? 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24) || 'item'
  return `stack-toolbar-${slot}-${slug}-${index}`
}

// primitives shared by both paths, mirroring Expo's shared.js

type IconResolution =
  | { form: 'sf'; name: string }
  | { form: 'src'; source: ImageSourcePropType; renderingMode?: 'template' | 'original' }
  | { form: 'xcasset'; name: string; renderingMode?: 'template' | 'original' }

function firstChildOfKind(children: ReactNode, kind: StackToolbarKind): ReactElement | null {
  let found: ReactElement | null = null
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) return
    if (isKind(child, kind)) found = child
  })
  return found
}

/** Joined string/number children, as in Expo's convertChildrenToString. */
export function toolbarChildrenToString(children: ReactNode): string {
  return Children.toArray(children)
    .filter(
      (child): child is string | number =>
        typeof child === 'string' || typeof child === 'number'
    )
    .join('')
}

function resolveIcon(
  iconProp: string | ImageSourcePropType | undefined,
  children: ReactNode
): IconResolution | undefined {
  const iconChild = firstChildOfKind(children, 'icon')
  if (iconChild) {
    const props = iconChild.props as StackToolbarIconProps
    if ('sf' in props) return { form: 'sf', name: props.sf }
    if ('xcasset' in props)
      return { form: 'xcasset', name: props.xcasset, renderingMode: props.renderingMode }
    return { form: 'src', source: props.src, renderingMode: props.renderingMode }
  }
  if (typeof iconProp === 'string') return { form: 'sf', name: iconProp }
  if (iconProp) return { form: 'src', source: iconProp }
  return undefined
}

/**
 * Dev-time children check, as in Expo: Button takes a single string or
 * Label/Icon/Badge; Menu takes Menu/MenuAction/Label/Icon/Badge. One reads
 * descriptors without rendering them, so the converters check instead of the
 * components.
 */
function checkButtonChildren(children: ReactNode): void {
  if (process.env.NODE_ENV === 'production' || typeof children === 'string') return
  const all = Children.toArray(children)
  const valid = all.filter(
    (child) =>
      typeof child === 'string' ||
      typeof child === 'number' ||
      (isValidElement(child) &&
        (isKind(child, 'label') || isKind(child, 'icon') || isKind(child, 'badge')))
  )
  if (all.length !== valid.length) {
    throw new Error(
      'Stack.Toolbar.Button only accepts a single string or Stack.Toolbar.Label, Stack.Toolbar.Icon, and Stack.Toolbar.Badge as its children.'
    )
  }
}

function checkMenuChildren(children: ReactNode): void {
  if (process.env.NODE_ENV === 'production') return
  const all = Children.toArray(children)
  const valid = all.filter(
    (child) =>
      isValidElement(child) &&
      (isKind(child, 'menu') ||
        isKind(child, 'menuAction') ||
        isKind(child, 'label') ||
        isKind(child, 'icon') ||
        isKind(child, 'badge'))
  )
  if (all.length !== valid.length) {
    throw new Error(
      'Stack.Toolbar.Menu only accepts Stack.Toolbar.Menu, Stack.Toolbar.MenuAction, Stack.Toolbar.Label, Stack.Toolbar.Icon, and Stack.Toolbar.Badge as its children.'
    )
  }
}

function labelFromChildren(children: ReactNode): string {
  const labelChild = firstChildOfKind(children, 'label')
  if (labelChild)
    return (labelChild.props as StackToolbarLabelProps).children ?? ''
  return toolbarChildrenToString(children)
}

interface BadgeData {
  value: string
  backgroundColor?: ColorValue
  color?: ColorValue
  fontFamily?: string
  fontSize?: number
  fontWeight?: TextStyle['fontWeight']
}

function badgeFromChildren(children: ReactNode): BadgeData | undefined {
  const badgeChild = firstChildOfKind(children, 'badge')
  if (!badgeChild) return undefined
  const props = badgeChild.props as StackToolbarBadgeProps
  const style = props.style as BadgeData | undefined
  return {
    value: props.children ?? '',
    ...(style?.backgroundColor !== undefined && { backgroundColor: style.backgroundColor }),
    ...(style?.color !== undefined && { color: style.color }),
    ...(style?.fontFamily !== undefined && { fontFamily: style.fontFamily }),
    ...(style?.fontSize !== undefined && { fontSize: style.fontSize }),
    ...(style?.fontWeight !== undefined && { fontWeight: style.fontWeight }),
  }
}

function labelStyleFromStyle(style: StyleProp<TextStyle> | undefined) {
  if (!style) return undefined
  const flat = style as TextStyle
  const picked = {
    ...(flat.fontFamily !== undefined && { fontFamily: flat.fontFamily }),
    ...(flat.fontSize !== undefined && { fontSize: flat.fontSize }),
    ...(flat.fontWeight !== undefined && { fontWeight: flat.fontWeight }),
    ...(flat.color !== undefined && { color: flat.color }),
  }
  return Object.keys(picked).length ? picked : undefined
}

// header path (left/right): NativeStackHeaderItem, mirroring Expo's
// convertStackToolbar*PropsToRNHeaderItem converters

type HeaderIcon = NonNullable<NativeStackHeaderItemMenuAction['icon']>

function headerIconFromResolution(
  resolution: IconResolution | undefined,
  iconRenderingMode: 'template' | 'original' | undefined,
  tintColor: ColorValue | undefined
): HeaderIcon | undefined {
  if (!resolution) return undefined
  if (resolution.form === 'sf') {
    return { type: 'sfSymbol', name: resolution.name } as HeaderIcon
  }
  const source =
    resolution.form === 'src' ? resolution.source : { uri: resolution.name }
  const effectiveMode =
    resolution.renderingMode ?? iconRenderingMode ?? (tintColor ? 'template' : 'original')
  return {
    type: 'image',
    source,
    tinted: effectiveMode === 'template',
  } as HeaderIcon
}

function buttonPropsToHeaderButton(
  props: StackToolbarButtonProps
): NativeStackHeaderItem | null {
  if (props.hidden) return null
  checkButtonChildren(props.children)
  const label = labelFromChildren(props.children)
  const icon = headerIconFromResolution(
    resolveIcon(props.icon, props.children),
    props.iconRenderingMode,
    props.tintColor
  )
  const badge = badgeFromChildren(props.children)
  return {
    type: 'button',
    label,
    ...(icon && { icon }),
    ...(props.variant !== undefined && { variant: props.variant }),
    ...(props.tintColor !== undefined && { tintColor: props.tintColor }),
    ...(props.disabled !== undefined && { disabled: props.disabled }),
    sharesBackground: !props.separateBackground,
    ...(props.hidesSharedBackground !== undefined && {
      hidesSharedBackground: props.hidesSharedBackground,
    }),
    ...(badge && {
      badge: {
        value: badge.value,
        ...((badge.color !== undefined ||
          badge.backgroundColor !== undefined ||
          badge.fontFamily !== undefined ||
          badge.fontSize !== undefined ||
          badge.fontWeight !== undefined) && {
          style: {
            ...(badge.color !== undefined && { color: badge.color }),
            ...(badge.backgroundColor !== undefined && {
              backgroundColor: badge.backgroundColor,
            }),
            ...(badge.fontFamily !== undefined && { fontFamily: badge.fontFamily }),
            ...(badge.fontSize !== undefined && { fontSize: badge.fontSize }),
            ...(badge.fontWeight !== undefined && { fontWeight: badge.fontWeight }),
          },
        }),
      },
    }),
    ...(labelStyleFromStyle(props.style) && {
      labelStyle: labelStyleFromStyle(props.style),
    }),
    ...(props.accessibilityLabel !== undefined && {
      accessibilityLabel: props.accessibilityLabel,
    }),
    ...(props.accessibilityHint !== undefined && {
      accessibilityHint: props.accessibilityHint,
    }),
    onPress: props.onPress ?? (() => {}),
    selected: !!props.selected,
  } as NativeStackHeaderItem
}

/**
 * Menu label/title from children and title prop, as in Expo's
 * computeMenuLabelAndTitle: title alone feeds both; a Label child feeds the
 * bar label while title feeds the menu title.
 */
function menuLabelAndTitle(
  children: ReactNode,
  title: string | undefined
): { label: string; menuTitle: string } {
  const labelChild = firstChildOfKind(children, 'label')
  const labelFromChild = (labelChild?.props as StackToolbarLabelProps | undefined)?.children
  return { label: labelFromChild ?? title ?? '', menuTitle: title ?? '' }
}

function menuActionPropsToHeaderAction(
  props: StackToolbarMenuActionProps
): NativeStackHeaderItemMenuAction {
  const { isOn, unstable_keepPresented, icon, image, iconRenderingMode, ...rest } =
    props as StackToolbarMenuActionProps & { image?: ImageSourcePropType }
  void image
  const shared = labelFromChildren(props.children)
  const iconResolution = resolveIcon(icon, props.children)
  const item = {
    ...rest,
    description: props.subtitle,
    type: 'action',
    label: shared,
    state: isOn ? ('on' as const) : ('off' as const),
    onPress: props.onPress ?? (() => {}),
  } as NativeStackHeaderItemMenuAction & { keepsMenuPresented?: boolean }
  if (unstable_keepPresented !== undefined) {
    item.keepsMenuPresented = unstable_keepPresented
  }
  const headerIcon = headerIconFromResolution(iconResolution, iconRenderingMode, undefined)
  if (headerIcon) item.icon = headerIcon
  return item
}

function menuElementToHeaderSubmenu(
  element: ReactElement,
  placement: 'left' | 'right'
): NativeStackHeaderItemMenuSubmenu | null {
  const props = element.props as StackToolbarMenuProps
  if (props.hidden) return null
  checkMenuChildren(props.children)
  const items = menuChildrenToHeaderMenuItems(props.children, placement)
  return {
    type: 'submenu',
    label: labelFromChildren(props.children) || props.title || '',
    multiselectable: true,
    ...(props.inline !== undefined && { inline: props.inline }),
    ...(props.palette !== undefined && {
      layout: (props.palette ? 'palette' : 'default') as 'palette' | 'default',
    }),
    ...(props.destructive !== undefined && { destructive: props.destructive }),
    ...(headerIconFromResolution(
      resolveIcon(props.icon, props.children),
      props.iconRenderingMode,
      props.tintColor
    ) && {
      icon: headerIconFromResolution(
        resolveIcon(props.icon, props.children),
        props.iconRenderingMode,
        props.tintColor
      ),
    }),
    items,
  }
}

function menuChildrenToHeaderMenuItems(
  children: ReactNode,
  placement: 'left' | 'right'
): (NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu)[] {
  const items: (NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu)[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (isKind(child, 'menuAction')) {
      items.push(menuActionPropsToHeaderAction(child.props as StackToolbarMenuActionProps))
    } else if (isKind(child, 'menu')) {
      const submenu = menuElementToHeaderSubmenu(child, placement)
      if (submenu) items.push(submenu)
    }
  })
  return items
}

function menuPropsToHeaderMenu(
  element: ReactElement,
  placement: 'left' | 'right'
): NativeStackHeaderItem | null {
  const props = element.props as StackToolbarMenuProps
  if (props.hidden) return null
  checkMenuChildren(props.children)
  const { label, menuTitle } = menuLabelAndTitle(props.children, props.title)
  const icon = headerIconFromResolution(
    resolveIcon(props.icon, props.children),
    props.iconRenderingMode,
    props.tintColor
  )
  const badge = badgeFromChildren(props.children)
  return {
    type: 'menu',
    label,
    ...(icon && { icon }),
    ...(props.variant !== undefined && { variant: props.variant }),
    ...(props.tintColor !== undefined && { tintColor: props.tintColor }),
    ...(props.disabled !== undefined && { disabled: props.disabled }),
    sharesBackground: !props.separateBackground,
    ...(props.hidesSharedBackground !== undefined && {
      hidesSharedBackground: props.hidesSharedBackground,
    }),
    ...(badge && { badge: { value: badge.value } }),
    ...(props.accessibilityLabel !== undefined && {
      accessibilityLabel: props.accessibilityLabel,
    }),
    ...(props.accessibilityHint !== undefined && {
      accessibilityHint: props.accessibilityHint,
    }),
    menu: {
      ...(menuTitle ? { title: menuTitle } : null),
      multiselectable: true,
      ...(props.palette !== undefined && {
        layout: (props.palette ? 'palette' : 'default') as 'palette' | 'default',
      }),
      items: menuChildrenToHeaderMenuItems(props.children, placement),
    },
  } as NativeStackHeaderItem
}

function spacerPropsToHeaderSpacing(
  props: StackToolbarSpacerProps,
  placement: 'left' | 'right'
): NativeStackHeaderItem | null {
  if (props.hidden) return null
  if (props.width === undefined) {
    warn(
      `Warning: Stack.Toolbar.Spacer requires \`width\` when used in ${placement} placement. Flexible spacers are only supported in bottom placement.`
    )
    return null
  }
  return { type: 'spacing', spacing: props.width } as NativeStackHeaderItem
}

/**
 * Convert toolbar children to native header items. Warns on children that do
 * not belong in left/right (search slots, primitives), as in Expo.
 */
export function toolbarChildrenToHeaderItems(
  children: ReactNode,
  placement: 'left' | 'right'
): NativeStackHeaderItem[] {
  const items: NativeStackHeaderItem[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (isKind(child, 'button')) {
      const item = buttonPropsToHeaderButton(child.props as StackToolbarButtonProps)
      if (item) items.push(item)
    } else if (isKind(child, 'menu')) {
      const menu = menuPropsToHeaderMenu(child, placement)
      if (menu) items.push(menu)
    } else if (isKind(child, 'spacer')) {
      const spacing = spacerPropsToHeaderSpacing(
        child.props as StackToolbarSpacerProps,
        placement
      )
      if (spacing) items.push(spacing)
    } else {
      warn(
        `Warning: Stack.Toolbar with placement="${placement}" only accepts <Stack.Toolbar.Button>, <Stack.Toolbar.Menu>, and <Stack.Toolbar.Spacer> as children. Found invalid child: ${childName(child)}`
      )
    }
  })
  return items
}

// bottom path: plain descriptors rendered by the toolbar host

export interface BottomToolbarButtonData {
  kind: 'button'
  identifier: string
  title?: string
  systemImageName?: string
  xcassetName?: string
  image?: ImageSourcePropType
  imageRenderingMode?: 'template' | 'original'
  tintColor?: ColorValue
  barButtonItemStyle?: 'plain' | 'done' | 'prominent'
  sharesBackground: boolean
  hidesSharedBackground?: boolean
  hidden?: boolean
  selected?: boolean
  disabled?: boolean
  badgeConfiguration?: BadgeData
  titleStyle?: {
    fontFamily?: string
    fontSize?: number
    fontWeight?: TextStyle['fontWeight']
    color?: ColorValue
  }
  accessibilityLabel?: string
  accessibilityHint?: string
  handler: () => void
}

export interface BottomToolbarMenuActionData {
  kind: 'action'
  identifier: string
  title: string
  icon?: string
  xcassetName?: string
  image?: ImageSourcePropType
  imageRenderingMode?: 'template' | 'original'
  disabled?: boolean
  destructive?: boolean
  hidden?: boolean
  isOn?: boolean
  keepPresented?: boolean
  discoverabilityLabel?: string
  subtitle?: string
  accessibilityLabel?: string
  accessibilityHint?: string
  handler: () => void
}

export interface BottomToolbarSubmenuData {
  kind: 'submenu'
  identifier: string
  title: string
  icon?: string
  xcassetName?: string
  image?: ImageSourcePropType
  imageRenderingMode?: 'template' | 'original'
  destructive?: boolean
  hidden?: boolean
  inline?: boolean
  palette?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
  children: (BottomToolbarMenuActionData | BottomToolbarSubmenuData)[]
}

export interface BottomToolbarMenuData {
  kind: 'menu'
  identifier: string
  /** Title shown on top of the menu. */
  title: string
  /** Bar-button label. */
  label: string
  systemImageName?: string
  xcassetName?: string
  image?: ImageSourcePropType
  imageRenderingMode?: 'template' | 'original'
  tintColor?: ColorValue
  barButtonItemStyle?: 'plain' | 'done' | 'prominent'
  sharesBackground: boolean
  hidesSharedBackground?: boolean
  disabled?: boolean
  destructive?: boolean
  hidden?: boolean
  inline?: boolean
  palette?: boolean
  elementSize?: 'auto' | 'small' | 'medium' | 'large'
  accessibilityLabel?: string
  accessibilityHint?: string
  children: (BottomToolbarMenuActionData | BottomToolbarSubmenuData)[]
}

export interface BottomToolbarSpacerData {
  kind: 'spacer'
  identifier: string
  width?: number
  sharesBackground?: boolean
  hidden?: boolean
}

export interface BottomToolbarSearchBarSlotData {
  kind: 'searchBar'
  identifier: string
  sharesBackground: boolean
  hidesSharedBackground?: boolean
  hidden?: boolean
}

export type BottomToolbarData =
  | BottomToolbarButtonData
  | BottomToolbarMenuData
  | BottomToolbarMenuActionData
  | BottomToolbarSubmenuData
  | BottomToolbarSpacerData
  | BottomToolbarSearchBarSlotData

interface BottomIconFields {
  sfName?: string
  xcassetName?: string
  image?: ImageSourcePropType
  imageRenderingMode?: 'template' | 'original'
}

function bottomIconFields(
  iconProp: string | ImageSourcePropType | undefined,
  imageProp: ImageSourcePropType | undefined,
  iconRenderingMode: 'template' | 'original' | undefined,
  tintColor: ColorValue | undefined,
  children: ReactNode,
  component: string
): BottomIconFields {
  const resolution = resolveIcon(iconProp, children)
  if (!resolution) {
    return {
      ...(imageProp !== undefined && {
        image: imageProp,
        imageRenderingMode: iconRenderingMode ?? (tintColor !== undefined ? 'template' : 'original'),
      }),
    }
  }
  if (resolution.form === 'sf') return { sfName: resolution.name }
  if (resolution.form === 'xcasset') {
    return {
      xcassetName: resolution.name,
      imageRenderingMode: resolution.renderingMode ?? iconRenderingMode,
    }
  }
  warn(
    `Warning: Stack.Toolbar.${component} in bottom placement does not support image icons via the \`icon\` prop or <Stack.Toolbar.Icon src={...} />; the image will not render. Use the \`icon\` prop with an SF Symbol name, the \`image\` prop, or <Stack.Toolbar.Icon xcasset="..." />.`
  )
  return {}
}

function bottomButtonData(
  props: StackToolbarButtonProps,
  index: number
): BottomToolbarButtonData {
  checkButtonChildren(props.children)
  const title = labelFromChildren(props.children) || undefined
  const { sfName, ...iconRest } = bottomIconFields(
    props.icon,
    props.image,
    props.iconRenderingMode,
    props.tintColor,
    props.children,
    'Button'
  )
  return {
    kind: 'button',
    identifier: fallbackIdentifier('bottom', index, title),
    ...(title !== undefined && { title }),
    ...(sfName !== undefined && { systemImageName: sfName }),
    ...iconRest,
    tintColor: props.tintColor,
    ...(props.variant !== undefined && { barButtonItemStyle: props.variant }),
    sharesBackground: !props.separateBackground,
    hidesSharedBackground: props.hidesSharedBackground,
    hidden: props.hidden,
    selected: props.selected,
    disabled: props.disabled,
    // Badges render on bottom toolbarItems items (proven on the iOS 27
    // simulator by the B2 probe), so One passes them through. Intentional
    // divergence from Expo, which calls bottom badges an iOS limitation.
    badgeConfiguration: badgeFromChildren(props.children),
    ...(labelStyleFromStyle(props.style) && { titleStyle: labelStyleFromStyle(props.style) }),
    accessibilityLabel: props.accessibilityLabel,
    accessibilityHint: props.accessibilityHint,
    handler: props.onPress ?? (() => {}),
  }
}

function bottomMenuActionData(
  props: StackToolbarMenuActionProps,
  index: number,
  path: string
): BottomToolbarMenuActionData {
  const title = labelFromChildren(props.children)
  const { sfName, ...iconRest } = bottomIconFields(
    props.icon,
    props.image,
    props.iconRenderingMode,
    undefined,
    props.children,
    'MenuAction'
  )
  return {
    kind: 'action',
    identifier: fallbackIdentifier(path, index, title),
    title,
    ...(sfName !== undefined && { icon: sfName }),
    ...iconRest,
    disabled: props.disabled,
    destructive: props.destructive,
    hidden: props.hidden,
    isOn: props.isOn,
    keepPresented: props.unstable_keepPresented,
    discoverabilityLabel: props.discoverabilityLabel,
    subtitle: props.subtitle,
    accessibilityLabel: props.accessibilityLabel,
    accessibilityHint: props.accessibilityHint,
    handler: props.onPress ?? (() => {}),
  }
}

function bottomMenuChildren(
  children: ReactNode,
  path: string
): (BottomToolbarMenuActionData | BottomToolbarSubmenuData)[] {
  const data: (BottomToolbarMenuActionData | BottomToolbarSubmenuData)[] = []
  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return
    if (isKind(child, 'menuAction')) {
      data.push(
        bottomMenuActionData(child.props as StackToolbarMenuActionProps, index, path)
      )
    } else if (isKind(child, 'menu')) {
      data.push(bottomSubmenuData(child, index, path))
    }
  })
  return data
}

function bottomSubmenuData(
  element: ReactElement,
  index: number,
  path: string
): BottomToolbarSubmenuData {
  const props = element.props as StackToolbarMenuProps
  checkMenuChildren(props.children)
  const title = labelFromChildren(props.children) || props.title || ''
  const { sfName, ...iconRest } = bottomIconFields(
    props.icon,
    props.image,
    props.iconRenderingMode,
    props.tintColor,
    props.children,
    'Menu'
  )
  return {
    kind: 'submenu',
    identifier: fallbackIdentifier(path, index, title),
    title,
    ...(sfName !== undefined && { icon: sfName }),
    ...iconRest,
    destructive: props.destructive,
    hidden: props.hidden,
    inline: props.inline,
    palette: props.palette,
    accessibilityLabel: props.accessibilityLabel,
    accessibilityHint: props.accessibilityHint,
    children: bottomMenuChildren(props.children, `${path}-submenu-${index}`),
  }
}

function bottomMenuData(props: StackToolbarMenuProps, index: number): BottomToolbarMenuData {
  checkMenuChildren(props.children)
  const { label, menuTitle } = menuLabelAndTitle(props.children, props.title)
  const { sfName, ...iconRest } = bottomIconFields(
    props.icon,
    props.image,
    props.iconRenderingMode,
    props.tintColor,
    props.children,
    'Menu'
  )
  return {
    kind: 'menu',
    identifier: fallbackIdentifier('bottom', index, label || menuTitle),
    title: menuTitle,
    label,
    ...(sfName !== undefined && { systemImageName: sfName }),
    ...iconRest,
    tintColor: props.tintColor,
    ...(props.variant !== undefined && { barButtonItemStyle: props.variant }),
    sharesBackground: !props.separateBackground,
    hidesSharedBackground: props.hidesSharedBackground,
    disabled: props.disabled,
    destructive: props.destructive,
    hidden: props.hidden,
    inline: props.inline,
    palette: props.palette,
    elementSize: props.elementSize,
    accessibilityLabel: props.accessibilityLabel,
    accessibilityHint: props.accessibilityHint,
    children: bottomMenuChildren(props.children, `bottom-menu-${index}`),
  }
}

/**
 * Convert bottom toolbar children to plain descriptors rendered by the
 * toolbar host. Unlike header items, hidden is preserved because the native
 * items own a hidden slot.
 */
export function toolbarChildrenToBottomData(children: ReactNode): BottomToolbarData[] {
  const data: BottomToolbarData[] = []
  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return
    if (isKind(child, 'button')) {
      data.push(bottomButtonData(child.props as StackToolbarButtonProps, index))
    } else if (isKind(child, 'menu')) {
      data.push(bottomMenuData(child.props as StackToolbarMenuProps, index))
    } else if (isKind(child, 'spacer')) {
      const props = child.props as StackToolbarSpacerProps
      data.push({
        kind: 'spacer',
        identifier: fallbackIdentifier('bottom', index, 'spacer'),
        ...(props.width !== undefined && { width: props.width }),
        // omitted unless explicit: the native spacer keeps the UIKit default.
        ...(props.sharesBackground !== undefined && {
          sharesBackground: props.sharesBackground,
        }),
        ...(props.hidden !== undefined && { hidden: props.hidden }),
      })
    } else if (isKind(child, 'searchBarSlot')) {
      const props = child.props as StackToolbarSearchBarSlotProps
      data.push({
        kind: 'searchBar',
        identifier: fallbackIdentifier('bottom', index, 'search'),
        sharesBackground: !props.separateBackground,
        hidesSharedBackground: props.hidesSharedBackground,
        hidden: props.hidden,
      })
    } else {
      warn(
        `Warning: Stack.Toolbar with bottom placement only accepts <Stack.Toolbar.Button>, <Stack.Toolbar.Menu>, <Stack.Toolbar.Spacer>, and <Stack.Toolbar.SearchBarSlot> as children. Found invalid child: ${childName(child)}`
      )
    }
  })
  return data
}

/**
 * Map one Stack.Toolbar to native-stack screen options. Left maps to
 * unstable_headerLeftItems and right to unstable_headerRightItems, the
 * genuine iOS header-item path in react-navigation 8 alpha, and forces the
 * header visible, as in Expo. An explicitly declared toolbar always wins
 * over incoming options: an empty conversion clears inherited items. Bottom
 * has no options equivalent (the toolbar is owned by the screen view
 * controller, so a bottom toolbar must mount in screen content); a bottom
 * toolbar in layout config warns and is ignored.
 */
export function appendStackToolbarPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackToolbarProps
): NativeStackNavigationOptions {
  const placement = props.placement ?? 'bottom'
  if (placement === 'bottom') {
    if (process.env.NODE_ENV !== 'production') {
      warn(
        'Warning: Stack.Toolbar with bottom placement in layout config has no effect. Mount it in screen content so the toolbar host sits inside the screen view controller.'
      )
    }
    return options
  }
  if (props.asChild) {
    const key = placement === 'left' ? 'headerLeft' : 'headerRight'
    return { ...options, headerShown: true, [key]: () => props.children }
  }
  const items = toolbarChildrenToHeaderItems(props.children, placement)
  const key =
    placement === 'left' ? 'unstable_headerLeftItems' : 'unstable_headerRightItems'
  return { ...options, headerShown: true, [key]: () => items }
}

export { isKind as isToolbarKind }
export type { NativeStackHeaderItem }
