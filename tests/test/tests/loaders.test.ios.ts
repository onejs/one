import { expect, test } from 'vitest'
import { remote } from 'webdriverio'
import { getWebDriverConfig } from '@vxrn/test/ios'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 3 }

test('loader data renders on native', sharedTestOptions, async () => {
  const driver = await remote(getWebDriverConfig())

  // verify the loader data is rendered on the home page
  // the index.tsx has a loader that returns { test: 'hello' }
  // and renders it with <Paragraph id="test-loader">{JSON.stringify(data)}</Paragraph>
  const loaderDataElement = await driver.$(`~test-loader`)
  const text = await loaderDataElement.getText()
  expect(text).toContain('hello')
})
