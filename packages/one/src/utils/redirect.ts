import { getURL } from '../getURL'
import { router } from '../imperative-api'

export const redirect = (path: string, status?: number) => {
  if (process.env.VITE_ENVIRONMENT === 'client') {
    router.navigate(path)
    return
  }

  return Response.redirect(path[0] === '/' ? `${getURL()}${path}` : path, status)
}
