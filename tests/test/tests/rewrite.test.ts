import { describe, expect, test } from 'vitest'
import { 
  parseRewriteRule, 
  applyRewrites, 
  reverseRewrite,
  getRewriteConfig 
} from '../../../packages/one/src/utils/rewrite'

describe('URL Rewrite Utilities', () => {
  describe('parseRewriteRule', () => {
    test('parses wildcard subdomain rule', () => {
      const rule = parseRewriteRule('*.start.chat', '/server/*')
      
      expect(rule.isSubdomain).toBe(true)
      expect(rule.pattern.test('tamagui.start.chat')).toBe(true)
      expect(rule.pattern.test('vite.start.chat')).toBe(true)
      expect(rule.pattern.test('start.chat')).toBe(false)
      expect(rule.pattern.test('sub.domain.start.chat')).toBe(false) // Only single wildcard
      
      const match = rule.pattern.exec('tamagui.start.chat')!
      expect(rule.target(match)).toBe('/server/tamagui')
    })
    
    test('parses exact subdomain rule', () => {
      const rule = parseRewriteRule('admin.app.com', '/admin')
      
      expect(rule.isSubdomain).toBe(true)
      expect(rule.pattern.test('admin.app.com')).toBe(true)
      expect(rule.pattern.test('user.app.com')).toBe(false)
      expect(rule.pattern.test('app.com')).toBe(false)
    })
    
    test('parses path wildcard rule', () => {
      const rule = parseRewriteRule('/api/*', '/v2/api/*')
      
      expect(rule.isSubdomain).toBe(false)
      expect(rule.pattern.test('/api/users')).toBe(true)
      expect(rule.pattern.test('/api/posts')).toBe(true)
      expect(rule.pattern.test('/other')).toBe(false)
      
      const match = rule.pattern.exec('/api/users')!
      expect(rule.target(match)).toBe('/v2/api/users')
    })
    
    test('handles multiple wildcards', () => {
      const rule = parseRewriteRule('*.*.example.com', '/multi/*/*')
      
      expect(rule.pattern.test('sub.domain.example.com')).toBe(true)
      expect(rule.pattern.test('a.b.example.com')).toBe(true)
      expect(rule.pattern.test('domain.example.com')).toBe(false)
      
      const match = rule.pattern.exec('api.v2.example.com')!
      expect(rule.target(match)).toBe('/multi/api/v2')
    })
    
    test('escapes special regex characters', () => {
      const rule = parseRewriteRule('api.app.com', '/api')
      
      // The dot should be escaped, not a wildcard
      expect(rule.pattern.test('api.app.com')).toBe(true)
      expect(rule.pattern.test('apiXapp.com')).toBe(false) // X should not match escaped dot
    })
  })
  
  describe('applyRewrites', () => {
    const rewrites = {
      '*.start.chat': '/server/*',
      'admin.app.com': '/admin',
      '*.api.app.com': '/api/v2/*',
      '/old/*': '/new/*'
    }
    
    test('rewrites subdomain to path', () => {
      const url = new URL('https://tamagui.start.chat/docs')
      const result = applyRewrites(url, rewrites)
      
      expect(result).not.toBeNull()
      expect(result?.pathname).toBe('/server/tamagui/docs')
      expect(result?.hostname).toBe('tamagui.start.chat')
    })
    
    test('handles exact subdomain match', () => {
      const url = new URL('https://admin.app.com/users')
      const result = applyRewrites(url, rewrites)
      
      expect(result).not.toBeNull()
      expect(result?.pathname).toBe('/admin/users')
    })
    
    test('handles nested subdomain wildcards', () => {
      const url = new URL('https://v3.api.app.com/users')
      const result = applyRewrites(url, rewrites)
      
      expect(result).not.toBeNull()
      expect(result?.pathname).toBe('/api/v2/v3/users')
    })
    
    test('preserves query parameters', () => {
      const url = new URL('https://tamagui.start.chat/search?q=test&page=2')
      const result = applyRewrites(url, rewrites)
      
      expect(result).not.toBeNull()
      expect(result?.pathname).toBe('/server/tamagui/search')
      expect(result?.search).toBe('?q=test&page=2')
    })
    
    test('preserves hash fragments', () => {
      const url = new URL('https://tamagui.start.chat/docs#section')
      const result = applyRewrites(url, rewrites)
      
      expect(result).not.toBeNull()
      expect(result?.pathname).toBe('/server/tamagui/docs')
      expect(result?.hash).toBe('#section')
    })
    
    test('handles path rewrites', () => {
      const url = new URL('https://example.com/old/path/to/resource')
      const result = applyRewrites(url, rewrites)
      
      expect(result).not.toBeNull()
      expect(result?.pathname).toBe('/new/path/to/resource')
    })
    
    test('returns null for non-matching URLs', () => {
      const url = new URL('https://other.com/path')
      const result = applyRewrites(url, rewrites)
      
      expect(result).toBeNull()
    })
    
    test('handles localhost subdomains', () => {
      const localhostRewrites = {
        '*.localhost': '/server/*'
      }
      
      const url = new URL('http://tamagui.localhost:3000/docs')
      const result = applyRewrites(url, localhostRewrites)
      
      expect(result).not.toBeNull()
      expect(result?.pathname).toBe('/server/tamagui/docs')
      expect(result?.port).toBe('3000')
    })
    
    test('applies first matching rule only', () => {
      const priorityRewrites = {
        '*.start.chat': '/priority/*',
        'tamagui.start.chat': '/specific'
      }
      
      const url = new URL('https://tamagui.start.chat/docs')
      const result = applyRewrites(url, priorityRewrites)
      
      expect(result).not.toBeNull()
      expect(result?.pathname).toBe('/priority/tamagui/docs')
    })
  })
  
  describe('reverseRewrite', () => {
    const rewrites = {
      '*.start.chat': '/server/*',
      'admin.app.com': '/admin',
      '/old/*': '/new/*'
    }
    
    test('converts internal path to subdomain URL', () => {
      const result = reverseRewrite('/server/tamagui/docs', rewrites)
      expect(result).toBe('https://tamagui.start.chat/docs')
    })
    
    test('handles exact path matches', () => {
      const result = reverseRewrite('/admin/users', rewrites)
      expect(result).toBe('https://admin.app.com/users')
    })
    
    test('handles path rewrites', () => {
      const result = reverseRewrite('/new/resource', rewrites)
      expect(result).toBe('/old/resource')
    })
    
    test('returns original path if no match', () => {
      const result = reverseRewrite('/other/path', rewrites)
      expect(result).toBe('/other/path')
    })
    
    test('preserves trailing slashes', () => {
      const result = reverseRewrite('/server/tamagui/', rewrites)
      expect(result).toBe('https://tamagui.start.chat/')
    })
    
    test('handles root paths', () => {
      const result = reverseRewrite('/server/tamagui', rewrites)
      expect(result).toBe('https://tamagui.start.chat')
    })
    
    test('handles complex nested paths', () => {
      const result = reverseRewrite('/server/vite/api/v2/users/123', rewrites)
      expect(result).toBe('https://vite.start.chat/api/v2/users/123')
    })
    
    test('uses http protocol in non-browser environment', () => {
      // In test environment, window is undefined
      const result = reverseRewrite('/server/test', rewrites)
      expect(result).toBe('https://test.start.chat')
    })
    
    test('handles localhost rewrites', () => {
      const localhostRewrites = {
        '*.localhost': '/server/*'
      }
      
      const result = reverseRewrite('/server/app/page', localhostRewrites)
      expect(result).toBe('https://app.localhost/page')
    })
  })
  
  describe('getRewriteConfig', () => {
    test('returns empty object when no config is set', () => {
      const originalEnv = process.env.ONE_URL_REWRITES
      delete process.env.ONE_URL_REWRITES
      
      const config = getRewriteConfig()
      expect(config).toEqual({})
      
      // Restore
      if (originalEnv) process.env.ONE_URL_REWRITES = originalEnv
    })
    
    test('parses config from process.env', () => {
      const originalEnv = process.env.ONE_URL_REWRITES
      process.env.ONE_URL_REWRITES = JSON.stringify({
        '*.test.com': '/test/*'
      })
      
      const config = getRewriteConfig()
      expect(config).toEqual({
        '*.test.com': '/test/*'
      })
      
      // Restore
      if (originalEnv) {
        process.env.ONE_URL_REWRITES = originalEnv
      } else {
        delete process.env.ONE_URL_REWRITES
      }
    })
    
    test('handles invalid JSON gracefully', () => {
      const originalEnv = process.env.ONE_URL_REWRITES
      process.env.ONE_URL_REWRITES = 'invalid json'
      
      const config = getRewriteConfig()
      expect(config).toEqual({})
      
      // Restore
      if (originalEnv) {
        process.env.ONE_URL_REWRITES = originalEnv
      } else {
        delete process.env.ONE_URL_REWRITES
      }
    })
  })
  
  describe('Complex rewrite scenarios', () => {
    test('handles multiple wildcard segments correctly', () => {
      const rewrites = {
        '*.*.cdn.com': '/cdn/*/*'
      }
      
      const url = new URL('https://images.user.cdn.com/avatar.jpg')
      const result = applyRewrites(url, rewrites)
      
      expect(result?.pathname).toBe('/cdn/images/user/avatar.jpg')
      
      const reversed = reverseRewrite('/cdn/images/user/avatar.jpg', rewrites)
      expect(reversed).toBe('https://images.user.cdn.com/avatar.jpg')
    })
    
    test('handles port numbers correctly', () => {
      const rewrites = {
        '*.localhost': '/dev/*'
      }
      
      const url = new URL('http://app.localhost:3000/page')
      const result = applyRewrites(url, rewrites)
      
      expect(result?.pathname).toBe('/dev/app/page')
      expect(result?.port).toBe('3000')
    })
    
    test('handles empty paths correctly', () => {
      const rewrites = {
        '*.app.com': '/apps/*'
      }
      
      const url = new URL('https://dashboard.app.com')
      const result = applyRewrites(url, rewrites)
      
      expect(result?.pathname).toBe('/apps/dashboard')
      
      const reversed = reverseRewrite('/apps/dashboard', rewrites)
      expect(reversed).toBe('https://dashboard.app.com')
    })
  })
})