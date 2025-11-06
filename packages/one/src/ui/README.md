# One Headless UI Components

Headless UI components for the One framework.

## Overview

The headless tabs system provides complete control over tab navigation UI while maintaining full integration with One's file-based routing system. Unlike traditional tabs that use `@react-navigation/bottom-tabs` with opinionated styling, these components are completely unstyled.

## Installation

The UI components are available through the `one/ui` submodule:

```tsx
import { Tabs, TabList, TabTrigger, TabSlot } from 'one/ui'
```

## Core Components

| Component | Description |
|-----------|-------------|
| `Tabs` | Root container that wraps the entire tab structure and manages navigation state |
| `TabList` | Container for `TabTrigger` components, typically the tab bar |
| `TabTrigger` | Pressable element that switches between tabs |
| `TabSlot` | Renders the currently active tab's content |

## Basic Usage

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

## Advanced Usage with Hooks

### useTabsWithChildren()

Hook version of `<Tabs>` that allows custom wrapper components:

```tsx
export function MyTabs({ children }) {
  const { NavigationContent } = useTabsWithChildren({ children })
  return <NavigationContent />
}
```

### useTabsWithTriggers()

Explicit trigger array version for advanced custom navigators:

```tsx
export function MyTabs({ children }) {
  const { NavigationContent } = useTabsWithTriggers({
    triggers: [
      { type: 'internal', name: 'home', href: '/' },
      { type: 'internal', name: 'profile', href: '/profile' },
    ]
  })
  return <NavigationContent />
}
```

### useTabSlot()

Returns current tab element for custom slot rendering:

```tsx
function MyTabSlot() {
  const slot = useTabSlot()
  return slot
}
```

### useTabTrigger()

Custom trigger logic for building custom tab buttons:

```tsx
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
```

## Example

See `/examples/one-basic/app/tabs/` for a working example with custom-styled tabs.
