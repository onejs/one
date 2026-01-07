// TODO get proper type
type Query = any

export function subscribeToZeroQuery(
  query: Query,
  onUpdate: (val: any) => void
): () => void {
  const view = query.materialize()
  view.hydrate()
  const unsubscribe = view.addListener(onUpdate)
  return () => {
    unsubscribe()
    view.destroy()
  }
}
