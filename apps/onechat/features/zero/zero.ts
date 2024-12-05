import { schema } from '~/config/zero/schema'
import { Zero } from '@rocicorp/zero'

// const encodedJWT = Cookies.get("jwt");
// const decodedJWT = encodedJWT && decodeJwt(encodedJWT);
// const userID = decodedJWT?.sub ? (decodedJWT.sub as string) : "anon";

export const zero = new Zero({
  userID: 'anon',
  auth: undefined,
  server: import.meta.env.VITE_PUBLIC_SERVER,
  schema,
  // This is often easier to develop with if you're frequently changing
  // the schema. Switch to 'idb' for local-persistence.
  kvStore: 'mem',
})
