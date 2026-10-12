import { isValidElement, useEffect, useRef, useState } from 'react'
import { DomView } from '../web/DomView'
import type { MaskProps } from './types'
let warnedInvalidMask = false

// css masks consume images. serialize the mounted mask's computed appearance
// as an svg image so text, gradients and app elements retain their alpha.
function image(node: HTMLElement, width: number, height: number): string {
  const clone = node.cloneNode(true) as HTMLElement
  const sources = [node, ...node.querySelectorAll<HTMLElement>('*')]
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>('*')]
  sources.forEach((source, index) => {
    const style = getComputedStyle(source)
    const copy = copies[index]
    for (const property of Array.from(style))
      copy.style.setProperty(property, style.getPropertyValue(property))
  })
  clone.style.opacity = '1'
  const content = new XMLSerializer().serializeToString(clone)
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${content}</foreignObject></svg>`)}")`
}

export function Mask({ maskElement, children, ...props }: MaskProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [mask, setMask] = useState<string>()
  const valid = isValidElement(maskElement)
  useEffect(() => {
    if (!valid) {
      if (!warnedInvalidMask) {
        warnedInvalidMask = true
        console.warn(
          'Mask: invalid `maskElement` prop was passed to Mask. expected a React element. no mask will render.'
        )
      }
      return
    }
    const node = ref.current
    if (!node) return
    const update = () => {
      const width = node.clientWidth,
        height = node.clientHeight
      if (width && height) setMask(image(node, width, height))
    }
    const resize = new ResizeObserver(update)
    const mutations = new MutationObserver(update)
    resize.observe(node)
    mutations.observe(node, {
      subtree: true,
      attributes: true,
      characterData: true,
      childList: true,
    })
    node.addEventListener('load', update, true)
    update()
    return () => {
      resize.disconnect()
      mutations.disconnect()
      node.removeEventListener('load', update, true)
    }
  }, [valid, maskElement])
  return (
    <DomView {...props}>
      {valid && (
        <div
          ref={ref}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0,
            overflow: 'hidden',
          }}
        >
          {maskElement}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          ...(valid && {
            maskImage: mask ?? 'linear-gradient(transparent,transparent)',
            WebkitMaskImage: mask ?? 'linear-gradient(transparent,transparent)',
            maskMode: 'alpha',
            maskSize: '100% 100%',
            maskRepeat: 'no-repeat',
          }),
        }}
      >
        {children}
      </div>
    </DomView>
  )
}
