# Daemon Routing Improvement Plan

## Problem Statement

The daemon routes requests from iOS simulators to dev servers, but WebSocket/HMR connections often route to the wrong server because:

1. **WebSocket upgrade requests have no user-agent header** - identifier is null
2. **All simulators share IP 127.0.0.1** - can't distinguish by IP
3. **Each HTTP request uses different ephemeral ports** - port-based correlation fails

## Root Cause Analysis

From log analysis (~21k requests, 2 simulators, 6 servers):

- **50+ failures**: "2 identifiers, 2 simulators - can't auto-map"
- **Pattern**: HTTP routes correctly via user-agent, but WebSocket falls back to wrong server
- **Port reuse**: HTTP uses ports 53035, 53262, 53271... WebSocket comes from different port

## Solution: Cookie-Based WebSocket Correlation

### Why Cookies Work

1. HTTP handler sets cookie: `Set-Cookie: one-route-id=<serverId>; Path=/`
2. WebSocket upgrade request **automatically includes cookies** (browser/runtime spec)
3. WebSocket handler reads cookie to find correct server immediately
4. No client-side changes needed - it's automatic

### Implementation Plan

#### Phase 1: Cookie-Based Routing (Primary Fix)

**server.ts changes:**

```typescript
// after resolveServer() in HTTP handler, set cookie on response
const cookieValue = `one-route-id=${server.id}; Path=/; Max-Age=3600`
res.setHeader('Set-Cookie', cookieValue)

// in WebSocket upgrade handler, check cookie first
function getRouteIdFromCookies(req: http.IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null
  const match = cookieHeader.match(/one-route-id=([^;]+)/)
  return match ? match[1] : null
}

// priority: cookie > pending mapping > cached > fallback
httpServer.on('upgrade', async (req, rawSocket, head) => {
  const routeId = getRouteIdFromCookies(req)
  if (routeId) {
    server = findServerById(state, routeId)
    if (server) {
      debugLog(`WebSocket: cookie route -> ${server.root}`)
    }
  }
  // ...existing fallback logic
})
```

#### Phase 2: State Cleanup

**Problem**: `clientMappings`, `pendingMappings`, `recentConnections` never cleaned up.

**Fix**:
```typescript
// add TTL tracking
interface ClientInfo {
  serverId: string
  simulatorUdid?: string
  matchedBy: 'user-agent' | 'tui' | 'auto'
  lastUsed: number  // add this
}

// cleanup interval (every 30s)
const MAPPING_TTL_MS = 3600000 // 1 hour
setInterval(() => {
  const now = Date.now()
  for (const [key, info] of clientMappings.entries()) {
    if (now - info.lastUsed > MAPPING_TTL_MS) {
      clientMappings.delete(key)
    }
  }
}, 30000)

// update lastUsed on every cache hit
if (clientInfo) {
  clientInfo.lastUsed = Date.now()
}
```

#### Phase 3: Unify Resolution Logic

**Problem**: HTTP and WebSocket have separate resolution paths.

**Fix**: Extract common `resolveServer()` with explicit fallback chain:

```typescript
interface ResolveResult {
  server: ServerRegistration
  method: 'cookie' | 'pending' | 'tui-cable' | 'cached' | 'ua-match' | 'fallback'
  learned: boolean
}

async function resolveServer(
  state: DaemonState,
  headers: http.IncomingHttpHeaders,
  servers: ServerRegistration[],
  bundleId: string | null,
  cookies?: string  // pass for WebSocket
): Promise<ResolveResult>
```

#### Phase 4: TUI Cable Consistency

**Problem**: Cable shows connected but routing differs.

**Fix**: Make TUI cable state reactive to actual routing:

```typescript
// after any successful route learning, update TUI
function syncCableState(simulatorUdid: string, serverId: string) {
  const serverIndex = servers.findIndex(s => s.id === serverId)
  if (serverIndex >= 0) {
    tuiState.setCable(simulatorUdid, serverIndex)
  }
}
```

## Testing Plan

1. **Two simulators, two servers**: Start both, verify HTTP routes correctly, verify WebSocket HMR goes to same server
2. **Remap via TUI**: Drag cable, verify next request goes to new server, verify WebSocket reconnects to new server
3. **Port reuse**: Rapid reload to force port reuse, verify correct routing
4. **Server restart**: Kill server, verify clients fail gracefully, start new server, verify rerouting

## Metrics

- **Before**: WebSocket routing ~50% correct (falls to fallback)
- **After**: WebSocket routing ~100% correct (via cookie)
- **Cache hit rate**: Should be >90% after initial mapping

## Rollback Plan

If cookie approach causes issues:
1. Disable cookie setting (remove `Set-Cookie` header)
2. Fall back to existing port-based matching (extended to 30s window)
3. Require explicit TUI cable connection for multi-simulator setups
