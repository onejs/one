import { Slot, router, useParams, usePathname } from 'one'

type ThingRender = {
  at: number
  url: string
  pathname: string
  params: Record<string, unknown>
}

export default function ThingLayout() {
  const pathname = usePathname()
  const params = useParams<{ id: string }>()

  if (typeof window !== 'undefined') {
    const w = window as unknown as { __thingRenders?: ThingRender[] }
    w.__thingRenders ??= []
    w.__thingRenders.push({
      at: performance.now(),
      url: location.pathname,
      pathname,
      params: { ...params },
    })
  }

  return (
    <div id="thing-layout">
      <span id="thing-pathname">{pathname}</span>
      <span id="thing-id">{params.id ?? '(empty)'}</span>
      <button
        id="replace-thing"
        type="button"
        onClick={() => router.replace('/thing/b/main')}
      >
        replace
      </button>
      <button id="push-thing" type="button" onClick={() => router.push('/thing/b/main')}>
        push
      </button>
      <Slot />
    </div>
  )
}
