import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET = process.env.R2_BUCKET_NAME!
export const R2_PUBLIC = process.env.R2_PUBLIC_URL!    // https://uploads.ocaq.app

export function assertR2Configured() {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error('R2 storage is not configured')
  }
}

export async function uploadPrivateWebp(key: string, body: Buffer): Promise<void> {
  assertR2Configured()
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: 'image/webp',
    CacheControl: 'private, max-age=31536000, immutable',
  }))
}

export async function privateObjectExists(key: string): Promise<boolean> {
  assertR2Configured()
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    return true
  } catch (error) {
    const storageError = error as { name?: string; $metadata?: { httpStatusCode?: number } }
    if (storageError.name === 'NotFound' || storageError.$metadata?.httpStatusCode === 404) return false
    throw error
  }
}

// Avatar üçün presigned URL yarat
export async function createAvatarUploadUrl(
  tenantId: string,
  userId:   string,
  size:     400 | 150 = 400,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const key = `uploads/${tenantId}/avatars/${userId}-${size}.webp`
  const publicUrl = `${R2_PUBLIC}/${key}`

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         key,
      ContentType: 'image/webp',
    }),
    { expiresIn: 60 },   // 60 saniyə
  )

  return { uploadUrl, publicUrl }
}
