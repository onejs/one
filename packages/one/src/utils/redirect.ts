import type { OneRouter } from '../interfaces/router'
import { getURL } from '../getURL'
import { router } from '../router/imperative-api'

export const redirect = (path: OneRouter.Href & string, status?: number) => {
  if (process.env.VITE_ENVIRONMENT === 'client') {
    router.navigate(path)
    return
  }

  return Response.redirect(path[0] === '/' ? `${getURL()}${path}` : path, status)
}
