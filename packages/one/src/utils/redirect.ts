import { getURL } from '../getURL'
import type { OneRouter } from '../interfaces/router'
import { router } from '../router/imperative-api'

export const redirect = (
  path: OneRouter.Href extends string ? OneRouter.Href : string,
  status?: number
) => {
  if (process.env.VITE_ENVIRONMENT === 'client') {
    router.navigate(path)
    return
  }

  const finalPath = path[0] === '/' ? `${getURL()}${path}` : path
  return Response.redirect(finalPath, status)
}
