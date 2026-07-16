export function getRequestOrigin(headersList: Headers) {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  const configured = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL
  if (configured) return new URL(configured).origin

  const host = headersList.get('x-forwarded-host') ?? headersList.get('host')
  if (!host) return 'http://localhost:3000'

  const forwardedProtocol = headersList.get('x-forwarded-proto')
  const protocol = forwardedProtocol === 'https' ? 'https' : 'http'
  return `${protocol}://${host}`
}
