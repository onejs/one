/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2023 Daishi Kato
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 **/

import { extname } from 'node:path'
import { parseSync } from 'oxc-parser'
import type { Plugin } from 'vite'

// PLAN
// see if we can use react server dom for the bridge between 'use dom' and native
// https://github.com/dai-shi/waku/blob/82dea924457fba1c60a9dfb071cb69dc44d7bbf2/packages/waku/src/lib/plugins/vite-plugin-rsc-transform.ts#L143

export function useDOMPlugin(): Plugin {
  return {
    name: 'one-vite-dom-plugin',

    async transform(code, id, options) {
      if (!code.includes('use dom')) {
        return
      }

      try {
        const parsed = parseSync(id, code)
        let hasUseDom = false

        for (let i = 0; i < parsed.program.body.length; ++i) {
          const item = parsed.program.body[i]!
          if (item.type === 'ExpressionStatement') {
            if (
              (item as any).directive === 'use dom' ||
              ((item as any).expression?.type === 'Literal' &&
                (item as any).expression?.value === 'use dom') ||
              ((item as any).expression?.type === 'StringLiteral' &&
                (item as any).expression?.value === 'use dom')
            ) {
              hasUseDom = true
              break
            }
          }
        }

        if (!hasUseDom) {
          return
        }

        // does have use dom - lets transform
      } catch {
        return
      }
    },
  }
}
