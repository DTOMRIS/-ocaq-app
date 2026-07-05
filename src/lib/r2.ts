import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
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
