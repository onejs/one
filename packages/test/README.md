# @vxrn/test

Shared test setup and utilities.

## Recommended Setup

### Web

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: '@vxrn/test/setup',
  }
})
```

Run tests with `TEST_ENV=dev yarn vitest --run` or `TEST_ENV=prod yarn vitest --run`.


### React Native iOS

`vitest.config.ios.ts`:

```ts
import { defineConfig } from 'vitest/config'

import defaultConfig from './vitest.config'

export default defineConfig({
  ...defaultConfig,
  test: {
    ...defaultConfig.test,
    globalSetup: '@vxrn/test/setup-ios',
    include: ['**/*.{test.\ios,spec.\ios}.?(c|m)[jt]s?(x)'],
  },
})
```

Run tests with `TEST_ENV=dev vitest --config ./vitest.config.ios.ts --run` or `TEST_ENV=prod vitest --config ./vitest.config.ios.ts --run`.

## Environment Variables

* `TEST_ENV`: Set to `dev` or `prod` to test with development server or production build.

### Additional Environment Variables

* `DEV_SERVER_URL`: Normally, the test setup will start and manage the development server automatically, but during development this may affect your productivity since every test run needs additional time to start the server and wait for it to be ready. If you want to use an already running development server, you can set this variable to the URL of the server (e.g. `http://localhost:8081`).
