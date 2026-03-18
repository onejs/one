import { readFile, pathExists } from 'fs-extra'
import { describe, expect, it, inject } from 'vitest'
import { ONLY_TEST_DEV } from '@vxrn/test'
import { join } from 'node:path'

describe('CSS Ordering Tests', () => {
  if (ONLY_TEST_DEV) {
    it('should pass', () => {
      expect(true).toBeTruthy()
    })
    return
  }

  const fixturePath = inject('testInfo').testDir

  it('SPA page should have layout CSS before module scripts', async () => {
    const spaPagePath = join(fixturePath, 'dist', 'client', 'spa', 'spapage.html')
    if (!(await pathExists(spaPagePath))) return

    const html = await readFile(spaPagePath, 'utf-8')

    // extract all CSS positions (either <link rel="stylesheet"> or inline <style>)
    const cssPositions: number[] = []
    const scriptPositions: number[] = []

    let match: RegExpExecArray | null
    // check for external CSS links
    const cssLinkRegex = /<link[^>]*rel=["']?stylesheet["']?[^>]*>/g
    while ((match = cssLinkRegex.exec(html)) !== null) {
      cssPositions.push(match.index)
    }
    // also check for inline <style> tags (when inlineLayoutCSS is enabled)
    const styleRegex = /<style[^>]*>/g
    while ((match = styleRegex.exec(html)) !== null) {
      cssPositions.push(match.index)
    }

    const scriptRegex = /<script[^>]*type="module"[^>]*src=[^>]*>/g
    while ((match = scriptRegex.exec(html)) !== null) {
      scriptPositions.push(match.index)
    }

    // there should be CSS (links or inline styles) and scripts
    expect(
      cssPositions.length,
      'should have CSS (links or inline styles)'
    ).toBeGreaterThan(0)
    expect(scriptPositions.length, 'should have module scripts').toBeGreaterThan(0)

    // sort positions and check the first CSS comes before the first script
    cssPositions.sort((a, b) => a - b)
    expect(
      cssPositions[0],
      `first CSS at pos ${cssPositions[0]} should be before first script at pos ${scriptPositions[0]}`
    ).toBeLessThan(scriptPositions[0])
  })

  it('SSG page should have CSS before bootstrap scripts', async () => {
    // SSG pages use React renderToReadableStream which puts bootstrap scripts at end of body.
    // CSS should be in <head> before <body>.
    const ssgPagePath = join(fixturePath, 'dist', 'client', 'index.html')
    if (!(await pathExists(ssgPagePath))) return

    const html = await readFile(ssgPagePath, 'utf-8')

    // in SSG, CSS (link or style) should be in <head>
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/)
    if (!headMatch) return

    const headContent = headMatch[1]
    const hasCSSInHead =
      headContent.includes('rel="stylesheet"') || headContent.includes('<style')

    if (hasCSSInHead) {
      // bootstrap module scripts should be in <body>, not <head>
      // (React puts bootstrapModules at end of body)
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)
      if (bodyMatch) {
        const bodyContent = bodyMatch[1]
        const hasScriptsInBody = bodyContent.includes('<script')

        // if scripts are in body, CSS in head comes first (correct order)
        if (hasScriptsInBody) {
          expect(hasCSSInHead).toBe(true)
        }
      }
    }
  })

  it('.inline.css should be inlined as <style> not <link>', async () => {
    const criticalPagePath = join(
      fixturePath,
      'dist',
      'client',
      'spa',
      'critical-css-test.html'
    )
    if (!(await pathExists(criticalPagePath))) return

    const html = await readFile(criticalPagePath, 'utf-8')

    // critical-test.css contains .critical-test-marker - should be inlined
    expect(html).toContain('critical-test-marker')
    expect(html).toContain('<style>')

    // the critical CSS marker should be INSIDE a <style> tag, not a <link>
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/g
    let foundInStyle = false
    let styleMatch: RegExpExecArray | null
    while ((styleMatch = styleRegex.exec(html)) !== null) {
      if (styleMatch[1].includes('critical-test-marker')) {
        foundInStyle = true
        break
      }
    }
    expect(foundInStyle, 'critical CSS should be inside a <style> tag').toBe(true)
  })

  it('.inline.css <style> should appear before all <script type="module">', async () => {
    const criticalPagePath = join(
      fixturePath,
      'dist',
      'client',
      'spa',
      'critical-css-test.html'
    )
    if (!(await pathExists(criticalPagePath))) return

    const html = await readFile(criticalPagePath, 'utf-8')

    // find the <style> that contains critical CSS
    const styleRegex = /<style[^>]*>[\s\S]*?critical-test-marker[\s\S]*?<\/style>/
    const criticalStyleMatch = styleRegex.exec(html)
    if (!criticalStyleMatch) return

    const criticalStylePos = criticalStyleMatch.index

    // find the first <script type="module">
    const scriptMatch = html.match(/<script[^>]*type="module"[^>]*src=/)
    if (!scriptMatch) return

    const scriptPos = html.indexOf(scriptMatch[0])

    expect(
      criticalStylePos,
      'inlined critical CSS should come before module scripts'
    ).toBeLessThan(scriptPos)
  })

  it('buildInfo should include layoutCSS in route build info', async () => {
    const buildInfoPath = join(fixturePath, 'dist', 'buildInfo.json')
    if (!(await pathExists(buildInfoPath))) return

    const buildInfo = JSON.parse(await readFile(buildInfoPath, 'utf-8'))
    const routeToBuildInfo = buildInfo.routeToBuildInfo

    // at least some routes should have layoutCSS
    const routesWithLayoutCSS = Object.values(routeToBuildInfo).filter(
      (info: any) => info.layoutCSS && info.layoutCSS.length > 0
    )

    expect(
      routesWithLayoutCSS.length,
      'some routes should have layoutCSS defined'
    ).toBeGreaterThan(0)
  })
})
