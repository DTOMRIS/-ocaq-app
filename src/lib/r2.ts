import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
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

// ─── AÇILIŞ FAYLLARI ────────────────────────────────────────────────────────
// Proyekt, smeta, təklif, ölçü cədvəli, foto. PDF böyük ola bilər (mimari
// proyekt 20–50 MB) → serverdən keçirmək əvəzinə PRESIGNED URL verilir,
// brauzer birbaşa R2-yə yükləyir. Serverless body limitinə dəymir.

export async function createOpeningFileUploadUrl(
  tenantId: string, openingId: string, fileId: string,
  fileName: string, contentType: string,
): Promise<{ uploadUrl: string; key: string }> {
  assertR2Configured()
  // Ad təhlükəsizləşdirilir — R2 açarında qəribə simvol problem çıxarır
  const temiz = fileName.replace(/[^\w.\-]+/g, '_').slice(-80)
  const key = `uploads/${tenantId}/acilis/${openingId}/${fileId}-${temiz}`
  const uploadUrl = await getSignedUrl(
    r2, new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 300 },   // 5 dəqiqə — böyük fayl üçün 60 san. azdır
  )
  return { uploadUrl, key }
}

/** Endirmə üçün müvəqqəti link. Fayllar PRİVATdır — birbaşa URL işləmir. */
export async function createFileDownloadUrl(key: string, fileName?: string): Promise<string> {
  assertR2Configured()
  return getSignedUrl(r2, new GetObjectCommand({
    Bucket: R2_BUCKET, Key: key,
    ...(fileName ? { ResponseContentDisposition: `attachment; filename="${fileName.replace(/"/g, '')}"` } : {}),
  }), { expiresIn: 300 })
}

export async function deleteObject(key: string): Promise<void> {
  assertR2Configured()
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
}
