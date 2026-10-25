/** measure browser height at the native-constrained width, once per animation frame. */
export function observeDOMSize(
  root: HTMLElement,
  report: (width: number, height: number) => void
): () => void {
  const view = root.ownerDocument.defaultView!
  let frame: number | undefined
  let previous = ''
  const measure = () => {
    frame = undefined
    const bounds = root.getBoundingClientRect()
    const width = Math.ceil(bounds.width)
    const height = Math.ceil(Math.max(bounds.height, root.scrollHeight))
    if (![width, height].every((value) => Number.isFinite(value) && value >= 0)) return
    const next = `${width}:${height}`
    if (previous === next) return
    previous = next
    report(width, height)
  }
  const schedule = () => {
    if (frame === undefined) frame = view.requestAnimationFrame(measure)
  }
  const observer = new ResizeObserver(schedule)
  observer.observe(root)
  view.addEventListener('resize', schedule)
  schedule()
  return () => {
    observer.disconnect()
    view.removeEventListener('resize', schedule)
    if (frame !== undefined) view.cancelAnimationFrame(frame)
  }
}
