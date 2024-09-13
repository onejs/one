// TODO get proper type
type Query = any

export async function resolveZeroQuery(query: Query): Promise<any> {
  const view = query.materialize()

  // slow query warning
  const tm = setTimeout(() => {
    console.warn(` Warning, query slow to resolve, ensure Zero server is running`, query)
  }, 2000)

  return new Promise((res, rej) => {
    try {
      const unsubscribe = view.addListener((snapshot) => {
        unsubscribe()
        clearTimeout(tm)
        res(snapshot)
      })

      view.hydrate()
    } catch (err) {
      clearTimeout(tm)
      rej(err)
    }
  })
}
