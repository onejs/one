import { getURL } from '../getURL'
import type { OneRouter } from '../interfaces/router'
import { router } from '../router/imperative-api'

export const redirect = (
  path: '__branded__' extends keyof OneRouter.Href ? string : OneRouter.Href,
  status?: number
) => {
  if (process.env.VITE_ENVIRONMENT === 'client') {
    router.navigate(path)
    return
  }

  const finalPath = path[0] === '/' ? `${getURL()}${path}` : path
  return Response.redirect(finalPath as string, status)
}
