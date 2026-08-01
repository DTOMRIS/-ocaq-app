export function getRequestOrigin(headersList: Headers) {
  // İstəyin gəldiyi HOST əvvəl gəlir — auth cookie bu domenə (məs. ocaq.dkagency.com.tr)
  // bağlıdır. VERCEL_URL (*.vercel.app) fərqli domendir → cookie getmir → 401 → boş data.
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  if (host) {
    const forwardedProtocol = headersList.get('x-forwarded-proto')
    const isLocal = host.includes('localhost') || host.startsWith('127.') || host.startsWith('0.0.0.0')
    const protocol = forwardedProtocol ?? (isLocal ? 'http' : 'https')
    return `${protocol}://${host}`
  }

  const configured = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL
  if (configured) return new URL(configured).origin

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

  return 'http://localhost:3000'
}
