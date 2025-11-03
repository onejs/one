# Headless UI Components Implementation Plan for One

This document outlines the plan to implement headless UI components in One framework. The investigation was conducted on the `expo-54` branch to ensure compatibility with the Expo SDK 54 upgrade.

---

## Executive Summary

1. **Custom Tabs (expo-router/ui)** - Stable, well-documented
2. **Native Tabs (expo-router/unstable-native-tabs)** - Experimental, iOS-focused
3. **Split View (expo-router/unstable-split-view)** - Experimental, iOS-only

This plan focuses primarily on **Custom Tabs**, which is the most mature and cross-platform of these features.

---

## Part 1: Custom Tabs (expo-router/ui)

### Overview

Custom Tabs provide a complete headless tabs system available via the `expo-router/ui` submodule. Unlike traditional tabs that use `@react-navigation/bottom-tabs` with opinionated styling, these components are completely unstyled and give developers full control over the UI.

**Status:** Experimental in SDK 52+, API inspired by Radix UI primitives

### Core Components

| Component | Description | Purpose |
|-----------|-------------|---------|
| `Tabs` | Root container | Wraps the entire tab structure, manages navigation state |
| `TabList` | Trigger container | Holds `TabTrigger` components, typically the tab bar |
| `TabTrigger` | Individual tab button | Pressable element that switches between tabs |
| `TabSlot` | Content renderer | Renders the currently active tab's content |

### Hooks API

| Hook | Description | Use Case |
|------|-------------|----------|
| `useTabsWithChildren()` | Hook version of `<Tabs>` | Custom wrapper components |
| `useTabsWithTriggers()` | Explicit trigger array | Advanced custom navigators |
| `useTabSlot()` | Returns current tab element | Custom slot rendering |
| `useTabTrigger()` | Custom trigger logic | Building custom tab buttons |

### Key Features

- **Declarative Routes**: Routes defined by `TabTrigger` components, not file system
- **Dynamic Routes**: Supports parametrized routes (e.g., `/[slug]`)
- **Nested Navigation**: Deep linking to complex route hierarchies
- **Reset Behavior**: `reset` prop controls stack navigator state
- **Custom Rendering**: `renderFn` for animations and screen persistence
- **External Links**: Can link to external URLs
- **Multiple Tab Bars**: Hide default `TabList`, create custom bars anywhere
- **`asChild` Pattern**: Forward props to custom components (using Radix Slot)

### Architecture

```
┌─────────────────────────────────────┐
│ <Tabs>                              │
│  ┌───────────────────────────────┐  │
│  │ <TabSlot />                   │  │  ← Renders active screen
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ <TabList>                     │  │  ← Tab bar container
│  │   <TabTrigger name="home"     │  │
│  │               href="/" />     │  │  ← Defines route & UI
│  │   <TabTrigger name="profile"  │  │
│  │               href="/profile"/>│  │
│  │ </TabList>                    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Example Usage

```tsx
import { Tabs, TabList, TabTrigger, TabSlot } from 'one/ui'

export default function Layout() {
  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList style={styles.tabBar}>
        <TabTrigger
          name="home"
          href="/"
          asChild
          resetOnFocus
        >
          <CustomButton icon="home">Home</CustomButton>
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <CustomButton icon="user">Profile</CustomButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  )
}
```

---

## Part 2: Native Tabs (Experimental)

### Overview

Native Tabs use platform-specific system UI components rather than custom JavaScript implementations. This provides a native "liquid glass" effect on iOS and Material Design tabs on Android.

**Import:** `expo-router/unstable-native-tabs`
**Status:** Experimental (SDK 54+), API subject to change
**Platform Support:** iOS (primary), Android (limited)

### Core Components

| Component | Description |
|-----------|-------------|
| `NativeTabs` | Container using native tab bar |
| `NativeTabs.Trigger` | Defines individual tabs (replaces `Screen`) |
| `Icon` | Tab icon (SF Symbols, Android drawables, or images) |
| `Label` | Tab text label |
| `Badge` | Notification indicator |
| `VectorIcon` | Vector-based icons |

### Key Features

**Cross-platform:**
- Conditional tab visibility via `hidden` prop
- Icon states: `{ default: ..., selected: ... }`
- Badge text or empty indicators

**iOS-specific:**
- Pop-to-top when tapping active tab
- Scroll-to-top functionality
- Minimize behavior on scroll (`minimizeBehavior` prop)
- iOS 26+: Search tab role and tab bar search integration

### Limitations

- **Android**: Maximum 5 tabs (Material Design constraint)
- **No nesting**: Cannot nest native tabs within other native tabs
- **FlatList issues**: Requires `disableTransparentOnScrollEdge` workaround
- **No height measurement**: Cannot programmatically measure tab bar height
- **iOS-focused**: Many features iOS-only

### Example

```tsx
import { NativeTabs } from 'one/unstable-native-tabs'

export default function Layout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="home">
        <Icon systemName="house.fill" />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" hidden={!isAdmin}>
        <Icon systemName="gear" />
        <Label>Settings</Label>
        <Badge text="3" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
```

---

## Part 3: Split View (Experimental)

### Overview

Split View provides iPad-style split screen layouts with sidebars and inspectors. Uses `react-native-screens` SplitView components.

**Import:** `expo-router/unstable-split-view`
**Status:** Experimental, iOS-only
**Requires:** `unstable_splitView: true` in router config + prebuild

### Core Components

| Component | Description |
|-----------|-------------|
| `SplitView` | Container managing split layout |
| `SplitView.Column` | Sidebar column (max 2) |
| `SplitView.Inspector` | Inspector pane |

### Architecture

```
┌──────────────────────────────────────┐
│ SplitView                            │
│ ┌────────┬──────────┬──────────────┐ │
│ │ Column │ Column   │ Main Content │ │
│ │ (Slot) │ (Slot)   │ (Slot)       │ │
│ │        │          │              │ │
│ └────────┴──────────┴──────────────┘ │
│          └──────────┴─ Inspector     │
└──────────────────────────────────────┘
```

### Constraints

- **iOS-only**: Falls back to `<Slot>` on other platforms
- **Maximum 2 columns** + 1 inspector
- **Cannot nest**: Only one `SplitView` in hierarchy
- **Must be root**: Cannot be inside another navigator (except Slot)
- **Number fixed**: Column count cannot change dynamically

### Example

```tsx
import { SplitView } from 'one/unstable-split-view'

export default function Layout() {
  return (
    <SplitView>
      <SplitView.Column>
        <Sidebar />
      </SplitView.Column>
      {/* Main content renders via Slot automatically */}
      <SplitView.Inspector>
        <DetailPanel />
      </SplitView.Inspector>
    </SplitView>
  )
}
```

---

## Implementation Plan for One

### Phase 1: Custom Tabs (High Priority)

#### 1.1 Core Infrastructure

**Create UI module structure:**

```
packages/one/src/ui/
├── TabContext.tsx       # Context definitions, types
├── TabRouter.tsx        # Custom router extending TabRouter
├── common.tsx           # Utilities (trigger parsing, screen conversion)
├── Slot.tsx             # Radix Slot wrapper with RN style flattening
├── useComponent.tsx     # Helper for component references
├── Tabs.tsx             # Root component + hooks
├── TabSlot.tsx          # Active tab renderer
├── TabList.tsx          # Trigger container
├── TabTrigger.tsx       # Individual tab button + hook
└── index.ts             # Exports
```

**Update exports:**

```json
// packages/one/package.json
{
  "exports": {
    "./ui": {
      "types": "./types/ui/index.d.ts",
      "import": "./dist/esm/ui/index.mjs",
      "require": "./dist/cjs/ui/index.cjs"
    }
  }
}
```

#### 1.2 Adapt to One's Architecture

**Dependencies check (✅ = exists, ⚠️ = needs verification):**

| Utility | Location in One | Status |
|---------|----------------|--------|
| `useRouteNode()` | `packages/one/src/router/Route.tsx` | ✅ |
| `useContextKey()` | `packages/one/src/router/Route.tsx` | ✅ |
| `useRouteInfo()` | `packages/one/src/hooks.tsx` | ✅ (as `useUnstableGlobalHref`) |
| `resolveHref()` | `packages/one/src/link/href.ts` | ✅ |
| `shouldLinkExternally()` | `packages/one/src/utils/url.ts` | ⚠️ (needs checking) |
| `routeToScreen()` | `packages/one/src/router/useScreens.tsx` | ✅ |
| `NavigatorContext` | `packages/one/src/views/Navigator.tsx` | ✅ |

**Key adaptations needed:**

1. **`triggersToScreens()` function** - Adapt route parsing to One's:
   - RouteNode structure
   - Linking configuration (verify compatibility with `getReactNavigationConfig`)
   - Screen rendering logic

2. **Router integration** - Ensure `ExpoTabRouter` works with One's navigation builder

3. **Context providers** - May need parallel context for tabs-specific data

#### 1.3 File Porting Matrix

| Expo Router File | Lines | One Destination | Complexity | Notes |
|-----------------|-------|-----------------|------------|-------|
| `ui/Tabs.tsx` | 305 | `src/ui/Tabs.tsx` | High | Core component, routing integration |
| `ui/TabContext.tsx` | 116 | `src/ui/TabContext.tsx` | Low | Mostly direct port, update types |
| `ui/TabSlot.tsx` | 169 | `src/ui/TabSlot.tsx` | Medium | Uses `react-native-screens` |
| `ui/TabTrigger.tsx` | 253 | `src/ui/TabTrigger.tsx` | High | Navigation logic adaptation |
| `ui/TabList.tsx` | 48 | `src/ui/TabList.tsx` | Low | Simple wrapper, direct port |
| `ui/TabRouter.tsx` | 80 | `src/ui/TabRouter.tsx` | Medium | Custom router, mostly direct |
| `ui/common.tsx` | 228 | `src/ui/common.tsx` | High | Screen parsing, needs adaptation |
| `ui/Slot.tsx` | 35 | `src/ui/Slot.tsx` | Low | Radix wrapper, direct port |
| `ui/useComponent.tsx` | 43 | `src/ui/useComponent.tsx` | Low | Helper hook, direct port |

**Total estimated lines:** ~1,300 lines of new code

#### 1.4 Testing Strategy

**Create example app:**

```
examples/one-custom-tabs/
├── app/
│   ├── _layout.tsx          # Custom tabs implementation
│   ├── index.tsx            # Home tab
│   ├── profile.tsx          # Profile tab
│   └── [slug].tsx           # Dynamic route tab
└── components/
    └── CustomTabButton.tsx  # asChild example
```

**Test scenarios:**
- ✅ Basic tab navigation
- ✅ Dynamic routes in tabs
- ✅ Nested stack navigators
- ✅ External links
- ✅ `asChild` pattern with custom components
- ✅ `resetOnFocus` behavior
- ✅ Multiple tab bars
- ✅ Hook-based custom tabs

### Phase 2: Native Tabs (Medium Priority)

**Prerequisites:**
- Phase 1 complete
- Decision on platform support strategy

**Implementation approach:**

1. Create `packages/one/src/native-tabs/` directory
2. Port NativeTabs components
3. Add `one/unstable-native-tabs` export
4. Document iOS-Android differences
5. Create iOS-specific example

**Files to port:**

```
packages/one/src/native-tabs/
├── types.ts
├── index.ts
├── NativeTabs.tsx
├── NativeTabTrigger.tsx
├── NativeBottomTabsNavigator.tsx
└── options.ts
```

**Challenges:**
- iOS-Android feature parity decisions
- Native module dependencies
- Testing on physical devices required

### Phase 3: Split View (Low Priority)

**Rationale for low priority:**
- iOS-only
- Requires `react-native-screens` with SplitView support
- Limited use cases (primarily iPad apps)
- Experimental API

**Implementation if needed:**

1. Create `packages/one/src/split-view/` directory
2. Port SplitView components
3. Add config flag requirement
4. Document iOS-only constraint

**Files to port:**

```
packages/one/src/split-view/
├── index.tsx
├── split-view.tsx
└── elements.tsx
```

---

## Technical Challenges & Solutions

### Challenge 1: Route Parsing Complexity

**Issue:** Expo's `triggersToScreens()` does complex href resolution that depends on Expo Router internals.

**Solution:**
- Adapt to One's `resolveHref()` implementation
- Test with various route patterns (dynamic, nested, relative)
- Use existing `getReactNavigationConfig()` linking setup

### Challenge 2: State Management

**Issue:** Custom router needs `triggerMap` in options - verify React Navigation builder accepts this.

**Solution:**
- Review `useNavigationBuilder` signature in React Navigation 7.x
- Extend options type if needed
- Test state persistence across navigation events

### Challenge 3: Screen Lifecycle

**Issue:** `lazy`, `unmountOnBlur`, `freezeOnBlur` options compatibility with One's screen implementation.

**Solution:**
- Review One's screen rendering in `useScreens.tsx`
- Ensure `TabSlot` rendering logic compatible
- Test screen mounting/unmounting behavior

### Challenge 4: Navigation Events

**Issue:** `tabPress`/`tabLongPress` events need to integrate with One's event system.

**Solution:**
- Use React Navigation's event emitter directly
- Test event propagation to parent navigators
- Verify `preventDefault()` works correctly

---

## Migration Path for Users

### Current Approach (Backward Compatible)

```tsx
// Existing One tabs - STILL WORKS
import { Tabs } from 'one'

export default function Layout() {
  return <Tabs />
}

// With href shortcut
export default function Layout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ href: '/' }} />
      <Tabs.Screen name="profile" options={{ href: '/profile' }} />
    </Tabs>
  )
}
```

### New Custom Tabs Approach

```tsx
// New headless tabs - FULL CONTROL
import { Tabs, TabList, TabTrigger, TabSlot } from 'one/ui'

export default function Layout() {
  return (
    <Tabs>
      <TabSlot />
      <TabList>
        <TabTrigger name="home" href="/">
          <CustomButton>Home</CustomButton>
        </TabTrigger>
        <TabTrigger name="profile" href="/profile">
          <CustomButton>Profile</CustomButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  )
}
```

### Advanced: Custom Tab Bar

```tsx
import { Tabs, TabSlot, useTabTrigger } from 'one/ui'

function CustomTabBar() {
  const home = useTabTrigger({ name: 'home' })
  const profile = useTabTrigger({ name: 'profile' })

  return (
    <View style={styles.customBar}>
      <Pressable {...home.triggerProps}>
        <Text style={home.trigger?.isFocused && styles.active}>
          Home
        </Text>
      </Pressable>
      <Pressable {...profile.triggerProps}>
        <Text style={profile.trigger?.isFocused && styles.active}>
          Profile
        </Text>
      </Pressable>
    </View>
  )
}

export default function Layout() {
  return (
    <Tabs>
      <TabSlot />
      <CustomTabBar />
    </Tabs>
  )
}
```

---

## Dependencies

### Already Available in One

- ✅ `@radix-ui/react-slot` (v1.0.2) - Used in Link component
- ✅ `@react-navigation/native` (v7.x)
- ✅ `@react-navigation/bottom-tabs` (v7.5.0)
- ✅ `react-native-screens` (v4.18.0)
- ✅ `react-native-safe-area-context` (v5.6.1)

### May Need Updates

- `@react-navigation/routers` - Check if version supports custom router options
- `react-native-screens` - Verify SplitView support version (for Phase 3)

---

## Documentation Plan

### User Documentation

1. **Guide: Custom Tabs in One**
   - Migration from traditional tabs
   - Basic setup
   - Styling patterns
   - Common patterns (tab badges, icons, animations)

2. **API Reference**
   - Component props
   - Hook signatures
   - Type exports
   - Event types

3. **Examples**
   - Basic custom tabs
   - Animated tab transitions
   - Bottom tab bar
   - Side tab navigation
   - Nested navigators in tabs

### Developer Documentation

1. **Architecture document**
   - How routing integration works
   - Navigator context usage
   - Screen lifecycle management

2. **Porting guide**
   - Differences from Expo Router
   - Breaking changes (if any)
   - Performance considerations

---

## Testing Checklist

### Unit Tests

- [ ] TabRouter state management
- [ ] Trigger parsing from children
- [ ] Href resolution
- [ ] External link detection
- [ ] resetOnFocus behavior

### Integration Tests

- [ ] Navigation between tabs
- [ ] Deep linking to tab routes
- [ ] Nested stack navigation
- [ ] Back button behavior
- [ ] State persistence

### E2E Tests

- [ ] Full user flows
- [ ] Tab switching
- [ ] URL synchronization (web)
- [ ] Screen transitions
- [ ] Memory leaks on tab switches

### Platform Tests

- [ ] iOS native
- [ ] Android native
- [ ] Web (React Native Web)
- [ ] SSR behavior (One's server rendering)

---

## Implementation Timeline

### Week 1-2: Phase 1 Setup
- Create UI module structure
- Port low-complexity files (Slot, useComponent, TabContext, TabList)
- Setup exports and types

### Week 3-4: Phase 1 Core
- Port high-complexity files (Tabs, TabTrigger, common, TabRouter)
- Adapt routing integration
- Basic testing

### Week 5: Phase 1 Polish
- Create example app
- Test all use cases
- Fix bugs
- Write documentation

### Week 6+: Optional Phases
- Phase 2 (Native Tabs) - if iOS features needed
- Phase 3 (Split View) - if iPad support needed

---

## Success Criteria

### Must Have
- ✅ Custom tabs work with One's file-based routing
- ✅ All Expo Router custom tabs features supported
- ✅ Backward compatible with existing `<Tabs>` component
- ✅ Works on iOS, Android, and Web
- ✅ Example app demonstrates all features
- ✅ Documentation covers migration path

### Nice to Have
- ✅ Native tabs for iOS features
- ✅ Performance optimizations
- ✅ Advanced examples (animations, gestures)
- ✅ TypeScript types are comprehensive

### Not Required
- Split View (can be Phase 3 or separate project)
- Custom routers beyond tabs

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| React Navigation incompatibility | High | Low | Test with current versions early |
| Routing integration issues | High | Medium | Extensive testing with various route patterns |
| Performance problems | Medium | Low | Profile early, optimize if needed |
| Type safety issues | Medium | Medium | Comprehensive type definitions |
| Breaking changes in Expo Router | Low | Medium | Pin to tested version, document differences |

---

## Questions for Decision

1. **Naming:** Keep `one/ui` or use `one/headless` or `one/custom-tabs`?
2. **Versioning:** Release as experimental or stable?
3. **Native Tabs Priority:** Should Phase 2 be included in initial release?
4. **Split View:** Include or defer to future release?
5. **Documentation Location:** Separate docs site or in main One docs?

---

## References

### Expo Router Documentation
- Custom Tabs: https://docs.expo.dev/router/advanced/custom-tabs/
- Router UI: https://docs.expo.dev/versions/latest/sdk/router-ui/
- Native Tabs: https://docs.expo.dev/router/advanced/native-tabs/
- Tutorial: https://expo.dev/blog/how-to-build-custom-tabs-with-expo-router-ui

### Source Code
- Expo Router UI: `~/github/expo/packages/expo-router/src/ui/`
- Expo Router Native Tabs: `~/github/expo/packages/expo-router/src/native-tabs/`
- Expo Router Split View: `~/github/expo/packages/expo-router/src/split-view/`

### Dependencies
- Radix UI Slot: https://www.radix-ui.com/primitives/docs/utilities/slot
- React Navigation: https://reactnavigation.org/

---

## Next Steps

1. Review this plan with team
2. Make decisions on open questions
3. Create feature branch: `feature/headless-tabs`
4. Begin Phase 1 implementation
5. Set up example app for testing
6. Iterate based on feedback

---

**Document Version:** 1.0
**Last Updated:** 2025-11-03
**Author:** Investigation based on Expo Router SDK 54
