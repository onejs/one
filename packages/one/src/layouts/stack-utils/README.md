# Stack Header Composition API

A declarative JSX API for configuring native stack headers in One.

## Overview

The Stack Header Composition API provides a more intuitive way to configure stack navigation headers using JSX components instead of the traditional options object. This is particularly useful for complex header configurations like large titles, custom buttons, and search bars.

## Installation

The components are available through the main `one` package:

```tsx
import { Stack } from 'one'
```

## Core Components

| Component | Description |
|-----------|-------------|
| `Stack.Screen` | Screen wrapper with header composition support |
| `Stack.Header` | Main header configuration container |
| `Stack.Header.Title` | Configure title text and large title mode |
| `Stack.Header.Left` | Custom left header content |
| `Stack.Header.Right` | Custom right header content |
| `Stack.Header.BackButton` | Back button configuration |
| `Stack.Header.SearchBar` | Search bar configuration |

## Basic Usage

```tsx
import { Stack } from 'one'

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index">
        <Stack.Header>
          <Stack.Header.Title large>Welcome</Stack.Header.Title>
        </Stack.Header>
      </Stack.Screen>
    </Stack>
  )
}
```

## Large Title with Blur Effect (iOS)

The classic iOS large title pattern with blur effect:

```tsx
<Stack.Screen name="feed">
  <Stack.Header blurEffect="regular" style={{ backgroundColor: 'transparent' }}>
    <Stack.Header.Title large>Feed</Stack.Header.Title>
  </Stack.Header>
</Stack.Screen>
```

## Custom Header Buttons

Add custom buttons to the left or right side of the header:

```tsx
<Stack.Screen name="profile">
  <Stack.Header>
    <Stack.Header.Title>Profile</Stack.Header.Title>
    <Stack.Header.Left asChild>
      <Button onPress={goBack}>Back</Button>
    </Stack.Header.Left>
    <Stack.Header.Right asChild>
      <Button onPress={openSettings}>Settings</Button>
    </Stack.Header.Right>
  </Stack.Header>
</Stack.Screen>
```

## Search Bar

Add an integrated search bar to the header:

```tsx
<Stack.Screen name="search">
  <Stack.Header>
    <Stack.Header.Title>Search</Stack.Header.Title>
    <Stack.Header.SearchBar
      placeholder="Search..."
      onChangeText={handleSearch}
    />
  </Stack.Header>
</Stack.Screen>
```

## Back Button Configuration

Customize the back button appearance and behavior:

```tsx
<Stack.Screen name="detail">
  <Stack.Header>
    <Stack.Header.Title>Detail</Stack.Header.Title>
    <Stack.Header.BackButton
      displayMode="minimal"
      hidden={false}
    >
      Back
    </Stack.Header.BackButton>
  </Stack.Header>
</Stack.Screen>
```

## Custom Header Component

Replace the entire header with a custom component:

```tsx
<Stack.Screen name="custom">
  <Stack.Header asChild>
    <CustomHeader />
  </Stack.Header>
</Stack.Screen>
```

## Combining with Options

You can combine the composition API with the traditional options prop:

```tsx
<Stack.Screen
  name="mixed"
  options={{
    animation: 'slide_from_right',
    gestureEnabled: true,
  }}
>
  <Stack.Header>
    <Stack.Header.Title large>Mixed Config</Stack.Header.Title>
  </Stack.Header>
</Stack.Screen>
```

## API Reference

### Stack.Header Props

| Prop | Type | Description |
|------|------|-------------|
| `hidden` | `boolean` | Hide the header entirely |
| `asChild` | `boolean` | Render children as the entire header |
| `blurEffect` | `'regular' \| 'prominent' \| ...` | iOS blur effect |
| `style` | `StyleProp` | Header style (backgroundColor, shadowColor) |
| `largeStyle` | `StyleProp` | Large title header style |

### Stack.Header.Title Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `string` | Title text |
| `large` | `boolean` | Enable large title mode |
| `style` | `StyleProp` | Title text style |
| `largeStyle` | `StyleProp` | Large title text style |

### Stack.Header.Left / Right Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Content to render |
| `asChild` | `boolean` | Required to render custom content |

### Stack.Header.BackButton Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `string` | Back button title |
| `hidden` | `boolean` | Hide the back button |
| `displayMode` | `'default' \| 'minimal' \| 'generic'` | Display mode |
| `withMenu` | `boolean` | Enable back button menu |
| `src` | `ImageSourcePropType` | Custom back button image |
| `style` | `TextStyle` | Back button title style |

### Stack.Header.SearchBar Props

Accepts all props from `react-native-screens` SearchBarProps.

## Comparison with Options API

**Traditional options API:**
```tsx
<Stack.Screen
  name="index"
  options={{
    title: 'Welcome',
    headerLargeTitle: true,
    headerBlurEffect: 'regular',
    headerRight: () => <Button>Action</Button>,
  }}
/>
```

**Composition API:**
```tsx
<Stack.Screen name="index">
  <Stack.Header blurEffect="regular">
    <Stack.Header.Title large>Welcome</Stack.Header.Title>
    <Stack.Header.Right asChild>
      <Button>Action</Button>
    </Stack.Header.Right>
  </Stack.Header>
</Stack.Screen>
```

Both approaches work, choose based on your preference. The composition API can be more readable for complex configurations.
