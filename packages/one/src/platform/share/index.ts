import { Share as unavailable } from './unavailable'
import type { ShareItem, ShareResult } from '../specs/OneShare.nitro'
export type { ShareItem, ShareItemType, ShareResult } from '../specs/OneShare.nitro'
let busy = false
async function share(items: ShareItem[]): Promise<ShareResult> {
  if (typeof window === 'undefined' || !navigator.share) return unavailable.share(items)
  if (busy) throw new Error('Share.share: a share sheet is already open')
  if (!items.length) throw new Error('Share.share: at least one item is required')
  busy = true
  try {
    const data: ShareData = {},
      text: string[] = [],
      files: File[] = []
    for (const item of items) {
      if (item.type === 'text') {
        if (!item.value.trim()) throw new Error('Share.share: text cannot be empty')
        text.push(item.value)
      } else if (item.type === 'url') {
        const url = new URL(item.value)
        if (url.protocol === 'file:')
          throw new Error('Share.share: expected a browser URL')
        if (data.url)
          throw new Error('Share.share: the browser supports one URL per share')
        data.url = url.href
      } else if (item.type === 'file') {
        const url = new URL(item.value)
        if (!['blob:', 'data:', 'https:', 'http:'].includes(url.protocol))
          throw new Error('Share.share: expected a browser file URL')
        const response = await fetch(url)
        if (!response.ok) throw new Error('Share.share: file could not be read')
        const blob = await response.blob()
        files.push(
          new File([blob], decodeURIComponent(url.pathname.split('/').at(-1) || 'file'), {
            type: blob.type,
          })
        )
      } else throw new Error('Share.share: invalid item type')
    }
    if (text.length) data.text = text.join('\n')
    if (files.length) data.files = files
    if (navigator.canShare && !navigator.canShare(data))
      throw new Error('Share.share: these items cannot be shared')
    try {
      await navigator.share(data)
      return { completed: true }
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return { completed: false }
      throw error
    }
  } finally {
    busy = false
  }
}
export const Share = Object.freeze({ share })
