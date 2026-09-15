# One Headless UI Components

Web-only headless UI components for the One framework.

## Overview

The headless tabs system provides complete control over browser tab navigation UI while maintaining full integration with One's file-based routing system. These components render DOM elements and are completely unstyled. Use `Tabs` from `one` for React Navigation 8 tabs on iOS and Android.

## Installation

The web UI components are available through the `one/ui` submodule. Put a React Navigation `Tabs` layout in the route's `.native.tsx` sibling when the same route runs on native.

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
    <nav>
      <button {...home.triggerProps}>Home</button>
      <button {...profile.triggerProps}>Profile</button>
    </nav>
  )
}
```

## Example

See `/examples/one-basic/app/tabs/` for a working example with custom web tabs and an RN8 native sibling.
