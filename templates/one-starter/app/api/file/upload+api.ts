import { S3mini } from 's3mini'
import { authServer } from '~/auth/server/authServer'
import { getZeroAuthData } from '~/auth/server/getZeroAuthData'
import { server } from '~/env'
import { SERVER_URL } from '~/constants'
import { randomId } from '~/helpers/randomId'
import type { Endpoint } from 'one'

const FOLDER = 'uploads'

type R2Bucket = {
  put: (
    key: string,
    value: Uint8Array | ArrayBuffer | string,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>
}

function cloudflareFilesBucket(): R2Bucket | undefined {
  return (globalThis as { __one_cf_r2_bucket?: R2Bucket }).__one_cf_r2_bucket
}

let _client: S3mini | null = null
function s3() {
  if (_client) return _client
  // s3mini folds the bucket into the endpoint url (path-style for R2)
  _client = new S3mini({
    endpoint: `${server.CLOUDFLARE_R2_ENDPOINT}/${server.CLOUDFLARE_R2_BUCKET}`,
    region: 'auto',
    accessKeyId: server.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: server.CLOUDFLARE_R2_SECRET_KEY,
  })
  return _client
}

async function putUploadObject(
  key: string,
  bytes: Uint8Array,
  contentType?: string,
): Promise<void> {
  const r2 = cloudflareFilesBucket()
  if (r2) {
    await r2.put(key, bytes, contentType ? { httpMetadata: { contentType } } : undefined)
    return
  }

  // putAnyObject buffers a single PUT and auto-promotes to multipart for
  // large files — the equivalent of the old @aws-sdk lib-storage Upload.
  const res = await s3().putAnyObject(key, bytes, contentType)
  if (!res.ok) {
    throw new Error(`s3 put failed: ${res.status}`)
  }
}

export const POST: Endpoint = async (req) => {
  // require an authenticated user for uploads
  const auth = await getZeroAuthData(authServer, req)
  if (!auth?.id || auth.id === 'anon') {
    return Response.json({ error: 'not authenticated' }, { status: 401 })
  }

  const formData = (await req.formData()) as unknown as FormData
  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return Response.json({ error: 'no file' }, { status: 400 })
  }

  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type]
  if (!extension || file.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'use a JPEG, PNG, WebP or GIF image up to 10 MB' }, { status: 400 })
  }
  const safeName = `${randomId()}.${extension}`
  const key = `${FOLDER}/${safeName}`

  const bytes = new Uint8Array(await file.arrayBuffer())
  const contentType = file.type || undefined

  try {
    if (process.env.NODE_ENV === 'development') {
      const { mkdir, writeFile } = await import('node:fs/promises')
      const directory = `${process.cwd()}/.orez/uploads`
      await mkdir(directory, { recursive: true })
      await writeFile(`${directory}/${safeName}`, bytes)
      return Response.json({ ok: true, key, url: `${SERVER_URL}/api/file/image/${safeName}` })
    }
    await putUploadObject(key, bytes, contentType)

    const url = `${server.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
    return Response.json({ ok: true, key, url })
  } catch (err) {
    console.error('[upload] failed', err)
    return Response.json(
      { error: 'upload failed' },
      { status: 500 },
    )
  }
}
