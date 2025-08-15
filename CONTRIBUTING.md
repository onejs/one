# Contributing Guide

Welcome, and thank you for your interest in contributing to One!

## Project Setup

First, install the dependencies:

```bash
yarn install
```

Next, initially build all the packages:

```bash
yarn build
```

You can also watch for changes in all packages and rebuild automatically:

```bash
yarn watch
```

## Guidelines

### `dependencies` or `peerDependencies`?

Declare packages as `peerDependencies` rather than `dependencies` if they meet any of the following criteria:

- The package must have only a single instance in the application. Multiple copies may result in runtime errors.
  - If we list them as `dependencies`, it will be easy for package managers to install multiple copies of the same package, leading to issues.
  - Example: `@react-navigation/native` (requires a single copy of `@react-navigation/core` as a dependency)
- The package includes native code. This typically also requires a single instance to avoid mismatches between native and JavaScript code, which can cause errors.
  - Example: `react-native-screens`

Other packages may be listed as `dependencies` to reduce clutter in the user's `package.json`. For example, `@react-navigation/elements`.
