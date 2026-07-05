'use server'

import { signIn } from '@/auth'
import { loginRateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'
import { AuthError } from 'next-auth'

export async function loginAction(_prevState: unknown, formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'E-poçt və şifrə daxil edin.' }
  }

  // IP bazlı rate limit
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'
  const { success } = await loginRateLimit.limit(ip)

  if (!success) {
    return {
      error: 'Çox sayda uğursuz cəhd. 15 dəqiqə sonra yenidən cəhd edin.',
    }
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    return { success: true }
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.cause?.err?.message === 'ACCOUNT_DISABLED') {
        return { error: 'Hesabınız deaktiv edilib. Adminlə əlaqə saxlayın.' }
      }
      if (err.cause?.err?.message === 'EMAIL_NOT_VERIFIED') {
        return { error: 'E-poçt adresiniz doğrulanmayıb. Zəhmət olmasa gələn qutunuzu yoxlayın.' }
      }
      return { error: 'E-poçt və ya şifrə yanlışdır.' }
    }
    return { error: 'Giriş zamanı xəta baş verdi.' }
  }
}
