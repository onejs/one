# one daemon - Multi-App Development Server Proxy

## Overview

A daemon process that runs on port 8081 and proxies requests to multiple `one dev` servers, enabling simultaneous development of multiple React Native apps without port conflicts.

## Problem

- React Native apps expect Metro/bundler on port 8081
- Running multiple apps requires manual port juggling
- Detox tests hardcode port 8081
- Same app in multiple checkouts (~/tamagui, ~/tamagui2) have identical bundleIdentifiers

## Solution

A smart proxy daemon that:
1. Runs on port 8081 (the standard RN port)
2. Dev servers register with daemon on random ports
3. Routes requests based on `?app=bundleId` query param (already sent by RN!)
4. Shows interactive picker when routing is ambiguous
5. Supports pre-registration for Detox/automation

## Key Discovery

React Native iOS already sends bundle ID in requests:
```objc
// RCTBundleURLProvider.mm
NSString *bundleID = [[NSBundle mainBundle] objectForInfoDictionaryKey:kCFBundleIdentifierKey];
[queryItems addObject:[[NSURLQueryItem alloc] initWithName:@"app" value:bundleID]];
```

So requests look like: `/index.bundle?platform=ios&dev=true&app=com.tamagui.kitchensink`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  one daemon (port 8081)                                         │
│                                                                 │
│  IPC: ~/.one/daemon.sock (Unix socket for CLI communication)   │
│                                                                 │
│  Registry:                                                      │
│    slot 0: {port: 51234, bundleId: 'com.foo.app', root: '~/a'} │
│    slot 1: {port: 51235, bundleId: 'com.foo.app', root: '~/b'} │
│    slot 2: {port: 51236, bundleId: 'com.bar.app', root: '~/c'} │
│                                                                 │
│  Routing Table (for ambiguous cases):                           │
│    simulatorUDID-ABC → slot 0                                   │
│    simulatorUDID-XYZ → slot 1                                   │
│                                                                 │
│  Request Flow:                                                  │
│    1. Parse ?app= from request                                  │
│    2. Find matching slots                                       │
│    3. If 1 match → proxy directly                              │
│    4. If 0 matches → 404 or fallback                           │
│    5. If >1 matches → check routing table or show picker       │
└─────────────────────────────────────────────────────────────────┘
```

## CLI Commands

### `one daemon`
Starts the daemon (foreground, for development):
```bash
one daemon
# Listening on :8081
# IPC socket: ~/.one/daemon.sock
```

### `one daemon start`
Starts daemon in background:
```bash
one daemon start
# Daemon started (pid 12345)
```

### `one daemon stop`
Stops background daemon:
```bash
one daemon stop
# Daemon stopped
```

### `one daemon status`
Shows daemon status and registered servers:
```bash
one daemon status
# Daemon running on :8081 (pid 12345)
#
# Registered servers:
#   [0] com.tamagui.kitchensink → :51234 (~/tamagui)
#   [1] com.tamagui.kitchensink → :51235 (~/tamagui2)
#   [2] com.example.app → :51236 (~/myapp)
#
# Active routes:
#   iPhone 15 (5728FED1...) → slot 0
```

### `one daemon route`
Pre-configure routing (for Detox/CI):
```bash
# Route by slot number
one daemon route --app=com.foo.app --slot=1

# Route by project path
one daemon route --app=com.foo.app --project=~/tamagui2

# Clear routing
one daemon route --app=com.foo.app --clear
```

## Changes to `one dev`

When daemon is running:
1. Detect daemon via IPC socket
2. Pick random available port (not 8081)
3. Register with daemon: `{port, bundleId, root}`
4. Show modified terminal output:
   ```
   one dev server running
     Local:   http://localhost:51234 (direct)
     Daemon:  http://localhost:8081 (via daemon)

   Press 'qr' to show Expo Go QR code
   ```

When daemon is NOT running:
- Behave as normal (use 8081 directly)

## Changes to `one run:ios` / `one run:android`

When launching app:
1. Get simulator/emulator UDID
2. Tell daemon: "route this UDID to my dev server's slot"
3. Launch app as normal

This enables automatic routing even for identical bundleIds.

## Interactive Picker

When ambiguous request arrives and no pre-configured route:

```
┌─────────────────────────────────────────────────────────┐
│  🔀 Multiple servers for com.tamagui.kitchensink       │
│                                                         │
│  Running simulators:                                    │
│    • iPhone 15 (iOS 18.1)                              │
│                                                         │
│  Select project:                                        │
│  [1] ~/tamagui  (port 51234)                           │
│  [2] ~/tamagui2 (port 51235)                           │
│                                                         │
│  Press 1-2, or 'r' + number to remember                │
└─────────────────────────────────────────────────────────┘
```

The picker:
- Shows in the daemon's terminal
- Blocks the HTTP request until selection
- Can "remember" choice for session (binds to connection characteristics)

## WebSocket Handling

Must proxy WebSocket connections for:
- `/hot` - Metro HMR
- `/__hmr` - Vite native HMR
- `/__client` - Client logging
- `/inspector/*` - React Native DevTools

WebSocket upgrade requests also include query params, so routing works the same.

## Implementation Files

```
packages/one/src/cli/daemon.ts          # CLI command
packages/one/src/daemon/
  index.ts                              # Main daemon server
  registry.ts                           # Server registration
  router.ts                             # Request routing logic
  picker.ts                             # Interactive picker UI
  ipc.ts                                # Unix socket IPC
  proxy.ts                              # HTTP/WS proxying
```

## Edge Cases

### No `?app=` parameter
- Older RN versions might not send it
- Fall back to: single server → use it, multiple → picker

### Server disconnects
- Remove from registry
- Clear any routes pointing to it

### Daemon crashes
- Dev servers should detect and fall back to direct mode
- Or retry connecting to daemon

### Multiple daemons
- Lock file at ~/.one/daemon.lock prevents multiple instances

## Detox Integration

For Detox tests, pre-configure routing before test run:

```javascript
// .detoxrc.js or test setup
beforeAll(async () => {
  // Tell daemon to route our bundleId to specific slot
  await exec('one daemon route --app=com.tamagui.kitchensink --slot=0');
});
```

Or via environment variable:
```bash
ONE_DAEMON_SLOT=0 detox test
```

## Future Enhancements

- Web UI at `localhost:8081/__daemon` for status/management
- Auto-discovery of running `one dev` servers
- Multiple daemon instances on different ports
- Remote daemon (for team development)

## Testing Plan

1. Unit tests for router logic
2. Integration tests with mock servers
3. Manual testing with real simulators
4. Detox test to verify automation works
