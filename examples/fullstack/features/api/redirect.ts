import { getURL } from '~/features/core/getURL'

export const redirect = (path: string, status?: number) => {
  return Response.redirect(path[0] === '/' ? `${getURL()}${path}` : path, status)
}
