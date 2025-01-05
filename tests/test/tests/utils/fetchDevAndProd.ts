// set this up for testing, pausing
export async function fetchDevAndProd(path = '/', type: 'text' | 'json' | 'headers') {
  return await Promise.all([
    fetch(`http://localhost:3111${path}`).then((res) => {
      if (type === 'headers') {
        return res.headers
      }
      return res[type]()
    }),
    fetch(`http://localhost:3112${path}`).then((res) => {
      if (type === 'headers') {
        return res.headers
      }
      return res[type]()
    }),
  ] as const)
}
