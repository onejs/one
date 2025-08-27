# Testing URL Rewriting Features

This document describes how to test the URL rewriting and enhanced middleware features in One.

## Quick Start

1. **Start the dev server:**
   ```bash
   cd apps/onestack.dev
   yarn dev
   ```

2. **Visit the test page:**
   Open http://localhost:6173/test-rewrites

3. **Test subdomain routing:**
   Try these URLs in your browser (`.localhost` domains work on modern systems):
   - http://app1.localhost:6173
   - http://app2.localhost:6173
   - http://docs.localhost:6173

## Features to Test

### 1. URL Rewriting

The following rewrite rules are configured in `vite.config.ts`:

```typescript
{
  web: {
    rewrites: {
      '*.localhost': '/subdomain/*',
      'docs.localhost': '/docs',
      '/old-docs/*': '/docs/*'
    }
  }
}
```

### 2. Middleware Capabilities

The middleware in `app/_middleware.tsx` demonstrates:

- **Request rewriting**: Modifying the URL before it reaches route handlers
- **Response interception**: Returning responses directly from middleware
- **Subdomain handling**: Detecting and routing based on subdomains

### 3. Link Component Integration

Links with internal paths like `/subdomain/app1` should automatically render with external URLs like `http://app1.localhost` when rewrites are configured.

## Running Integration Tests

```bash
# Run all tests
yarn test

# Run rewrite tests specifically
yarn vitest run rewrite-integration.test.tsx

# Run with debugging (opens browser)
DEBUG=1 yarn vitest run rewrite-integration.test.tsx
```

## Test Files

- **Test page**: `/app/test-rewrites.tsx` - Interactive test page
- **Middleware**: `/app/_middleware.tsx` - Request/response handling
- **Subdomain pages**: `/app/subdomain/[name]/index.tsx` - Dynamic subdomain routing
- **Integration tests**: `/tests/rewrite-integration.test.tsx` - Automated tests

## Manual Testing Checklist

### Basic Functionality

- [ ] Visit http://localhost:6173/test-rewrites
- [ ] Check that current URL is displayed correctly
- [ ] Verify links show their rendered hrefs

### Subdomain Routing

- [ ] Visit http://app1.localhost:6173
- [ ] Verify it shows "Subdomain: app1"
- [ ] Navigate to http://app1.localhost:6173/about
- [ ] Verify navigation between subdomain pages works

### Link Transformation

- [ ] Hover over subdomain links on test page
- [ ] Verify browser shows subdomain URLs in status bar
- [ ] Click subdomain links
- [ ] Verify navigation works correctly

### Middleware Response

- [ ] Click "Test Middleware Response" button
- [ ] Verify JSON response appears
- [ ] Check response contains expected fields

### Path Rewrites

- [ ] Visit http://localhost:6173/old-docs/intro
- [ ] Verify it redirects or rewrites to /docs/intro

## Troubleshooting

### Subdomain Not Resolving

If `*.localhost` doesn't work on your system:

1. **Check your OS**: Modern macOS and Linux support `.localhost` by default
2. **Try 127.0.0.1**: Use `http://127.0.0.1:6173` instead
3. **Add to hosts file** (if needed):
   ```bash
   sudo echo "127.0.0.1 app1.localhost" >> /etc/hosts
   sudo echo "127.0.0.1 app2.localhost" >> /etc/hosts
   ```

### Links Not Transforming

1. Check that rewrites are configured in `vite.config.ts`
2. Verify environment variable is set: `process.env.ONE_URL_REWRITES`
3. Check browser console for errors
4. Ensure you've rebuilt after config changes

### Middleware Not Running

1. Verify `_middleware.tsx` is in the correct location
2. Check that it exports a default function
3. Look for errors in server console
4. Ensure middleware is created with `createMiddleware()`

## Implementation Details

### How It Works

1. **Configuration**: Rewrite rules are defined in `vite.config.ts`
2. **Environment**: Rules are passed to client via `process.env.ONE_URL_REWRITES`
3. **Middleware**: Requests are modified before routing
4. **Links**: The Link component applies reverse rewrites for display
5. **Navigation**: React Navigation handles routing with rewritten paths

### Key Files

- `/packages/one/src/utils/rewrite.ts` - Rewrite utilities
- `/packages/one/src/createMiddleware.ts` - Middleware types
- `/packages/one/src/createHandleRequest.ts` - Request handling
- `/packages/one/src/link/href.ts` - Link URL resolution
- `/packages/one/src/router/getLinkingConfig.ts` - React Navigation integration