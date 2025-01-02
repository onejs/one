import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { randomId } from '~/helpers/randomId.native'

// TODO: upload folder based on user or server

const endpoint = 'https://aa20b480cc813f2131bc005e2b7fd140.r2.cloudflarestorage.com/onechatimages'
const bucket = 'onechatimages'
const folder = 'uploads'

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
  endpoint,
  region: 'auto',
  forcePathStyle: true, // Important for bucket compatibility with R2
})

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return Response.json({ error: 'Failed to parse the form' }, { status: 500 })
  }

  const fileStream = file.stream()

  const uploadParams = {
    Bucket: bucket,
    Key: `${folder}/${randomId()}-${file.name}`,
    Body: fileStream,
    ContentType: file.type,
  }

  try {
    const uploader = new Upload({
      client: s3Client,
      params: uploadParams,
    })

    await uploader.done()

    const key = uploadParams.Key
    const url = `https://one1.dev/${bucket}/${key}`

    return new Response(JSON.stringify({ message: 'File uploaded successfully', key, url }), {
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to upload file', details: `${error}` }), {
      status: 500,
    })
  }
}
