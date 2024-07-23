import { apiRoute } from '~/features/api/apiRoute'
import { ensureAuth } from '~/features/api/ensureAuth'
import type { UserContextType } from '~/features/user/types'

export default apiRoute(async (req) => {
  const { supabase, user } = await ensureAuth({ req })

  return Response.json({
    user,
  } satisfies UserContextType)
})
