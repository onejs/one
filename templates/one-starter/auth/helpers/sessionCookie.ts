import { parseSetCookieHeader } from 'better-auth/cookies'

// native oauth and magic-link completions receive the auth server's set-cookie
// header inside the callback deep link and must recover the raw session token
// from it. the server's cookie prefix differs by environment (a __Host-
// product prefix in production, better-auth's default name locally), so match
// better-auth's invariant `.session_token` suffix instead of a hardcoded
// name — a server-side prefix change must not silently break native sign-in.
export function readAuthSessionTokenFromHeader(setCookieHeader: string) {
  for (const [name, cookie] of parseSetCookieHeader(setCookieHeader)) {
    if (!name.endsWith('.session_token') || !cookie.value) continue
    try {
      // the cookie value is `${token}.${signature}`; the bearer transport
      // wants the unsigned token.
      return decodeURIComponent(cookie.value).split('.')[0] ?? cookie.value
    } catch {
      return cookie.value
    }
  }
  return null
}
