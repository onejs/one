import type { Plugin } from 'vite'

let swcModule: typeof import('@swc/core') | null = null

async function getSwc() {
  if (!swcModule) {
    swcModule = await import('@swc/core')
  }
  return swcModule
}

// regex to detect class features hermes can't handle:
// class properties (field = value) and private fields (#field)
const CLASS_PROPERTY_RE = /class\s*[\w{][\s\S]*?(?:=\s|#\w)/

/**
 * SWC transform plugin for Hermes compatibility.
 * Hermes doesn't support class field initializers or private fields/methods.
 * Uses SWC env.include to selectively transform only those features.
 *
 * Inspired by rollipop's approach:
 * https://github.com/leegeunhyeok/rollipop/blob/main/packages/rollipop/src/core/plugins/swc-plugin.ts
 */
export function hermesCompatPlugin(): Plugin {
  return {
    name: 'vxrn:hermes-compat',
    enforce: 'pre',

    async transform(code, id) {
      // only for native environments
      if (this.environment.name !== 'ios' && this.environment.name !== 'android') {
        return
      }

      // skip non-js files
      if (!/\.[cm]?[jt]sx?$/.test(id)) {
        return
      }

      // skip virtual modules and prebuilt modules
      if (id.includes('\0') || id.includes('virtual:') || id.includes('.vxrn/')) {
        return
      }

      // quick check: skip files without class keyword
      if (!code.includes('class ') && !code.includes('class{')) {
        return
      }

      try {
        const swc = await getSwc()
        const result = await swc.transform(code, {
          filename: id,
          configFile: false,
          swcrc: false,
          sourceMaps: false,
          inputSourceMap: false,
          env: {
            targets: { node: 9999 },
            include: [
              'transform-block-scoping',
              'transform-class-properties',
              'transform-private-methods',
              'transform-private-property-in-object',
            ],
          },
          jsc: {
            parser: {
              syntax: 'typescript',
              tsx: true,
            },
            transform: {
              react: {
                runtime: 'preserve',
              },
            },
            externalHelpers: false,
            assumptions: {
              setPublicClassFields: true,
              privateFieldsAsProperties: true,
            },
          },
          isModule: id.endsWith('.cjs') ? false : true,
        })

        return { code: result.code }
      } catch (err) {
        // don't crash on transform errors, let rolldown handle the original
        console.warn(`[vxrn:hermes-compat] transform error for ${id}:`, err)
        return
      }
    },
  }
}
