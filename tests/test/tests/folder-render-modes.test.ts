import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL

describe('Folder Render Modes', () => {
  describe('Basic folder suffix inheritance', () => {
    it('should render routes in folder+ssr with SSR', async () => {
      const response = await fetch(`${serverUrl}/folder-modes`)
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(html).toContain('Folder Modes SSR Index')
    })

    it('should render nested route in folder+ssr with SSR', async () => {
      const response = await fetch(`${serverUrl}/folder-modes/analytics`)
      const html = await response.text()

      expect(html).toContain('Analytics SSR Page')
    })
  })

  describe('File suffix overrides folder suffix', () => {
    it('should use file suffix (spa) over folder suffix (ssr)', async () => {
      const response = await fetch(`${serverUrl}/folder-modes/override`)
      const html = await response.text()

      expect(response.status).toBe(200)
      // SPA routes render client-side, check for SPA mode marker
      expect(html).toContain('__vxrnIsSPA')
    })
  })

  describe('Nested folder overrides', () => {
    it('should use inner folder suffix (ssg) over outer folder suffix (ssr)', async () => {
      const response = await fetch(`${serverUrl}/folder-modes/nested/report`)
      const html = await response.text()

      expect(html).toContain('Report SSG Page')
      // SSG routes should be pre-rendered with full content
    })
  })

  describe('Route path cleaning', () => {
    it('should strip +ssr from folder name in URL', async () => {
      // URLs should be clean without render mode suffixes
      const response = await fetch(`${serverUrl}/folder-modes`)
      expect(response.status).toBe(200)

      // The suffix should NOT be in the URL
      const badResponse = await fetch(`${serverUrl}/folder-modes+ssr`)
      expect(badResponse.status).toBe(404)
    })

    it('should strip +ssg from nested folder name in URL', async () => {
      const response = await fetch(`${serverUrl}/folder-modes/nested/report`)
      expect(response.status).toBe(200)

      // The suffix should NOT be in the URL
      const badResponse = await fetch(`${serverUrl}/folder-modes/nested+ssg/report`)
      expect(badResponse.status).toBe(404)
    })
  })

  describe('Group directories with render mode suffixes', () => {
    it('should work with group directories like (app)+ssr', async () => {
      // Group folders are invisible in URLs, suffix should also be invisible
      const response = await fetch(`${serverUrl}/dashboard`)
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('App Group Dashboard')
    })

    it('should not have group or suffix in URL', async () => {
      // Neither (app) nor +ssr should be in URL
      const badResponse1 = await fetch(`${serverUrl}/(app)/dashboard`)
      expect(badResponse1.status).toBe(404)

      const badResponse2 = await fetch(`${serverUrl}/(app)+ssr/dashboard`)
      expect(badResponse2.status).toBe(404)
    })
  })
})
