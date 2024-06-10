import fs from 'node:fs'
import path from 'node:path'

export async function loadEnv(root: string) {
  const envPath = path.join(root, '.env')
  if (!fs.existsSync(envPath)) return
  const dotenv = await import('dotenv')
  const result = dotenv.config({ path: envPath })
  if (result.error) throw result.error
  return true
}
