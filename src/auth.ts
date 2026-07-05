import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'E-poçt', type: 'email' },
        password: { label: 'Şifrə', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1)

        if (!user || !user.password_hash) return null
        if (!user.is_active) throw new Error('ACCOUNT_DISABLED')
        if (!user.is_email_verified) throw new Error('EMAIL_NOT_VERIFIED')

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )
        if (!valid) return null

        // Audit: son giriş vaxtını yenilə
        await db
          .update(users)
          .set({ last_login_at: new Date() })
          .where(eq(users.id, user.id))

        return {
          id:        user.id,
          email:     user.email,
          name:      user.name,
          role:      user.role,
          tenant_id: user.tenant_id,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // İlk girişdə user mövcuddur — token-ə əlavə et
      if (user) {
        token.id        = user.id as string
        token.role      = (user as Record<string, unknown>).role as string
        token.tenant_id = (user as Record<string, unknown>).tenant_id as string
      }
      return token
    },
    async session({ session, token }) {
      // Session-a tenant_id və role əlavə et
      if (token) {
        session.user.id        = token.id as string
        session.user.role      = token.role as string
        session.user.tenant_id = token.tenant_id as string
      }
      return session
    },
  },
})
