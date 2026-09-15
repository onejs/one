# React Native Lite

React Native Lite is a lightweight, main-thread native runtime for iOS.

## Overview

This package (`@vxrn/react-native-lite`) provides the core TypeScript renderer runtime for React Native Lite:

- **Mutation Reconciler**: Custom React 19 reconciler mutation host targeting UIKit native components.
- **Commit-Phase Allocation**: Render-phase work creates in-memory instances only without mutating native bridge state or registering event handlers; allocation, property synchronization, and event handler registration occur at commit.
- **Teardown**: Complete recursive unregistration of native views, event handlers, and validation handlers for removed and cleared subtrees.
- **Typed Bridge**: Strongly typed native bridge interface with clear failure when the native bridge is absent.
- **Host Components**: Minimal core host component primitives: `<View>`, `<Text>`, `<Button>`, and `<TextInput>`.
