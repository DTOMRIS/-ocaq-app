import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { isOperationalRole } from '@/lib/operational-roles'

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

        const email = String(credentials.email).trim().toLowerCase()

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (!user || !user.password_hash) return null
        if (!user.is_active) throw new Error('ACCOUNT_DISABLED')
        if (!user.is_email_verified) throw new Error('EMAIL_NOT_VERIFIED')
        if (!isOperationalRole(user.role)) throw new Error('ROLE_NOT_ALLOWED')

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
          session_version: user.updated_at.toISOString(),
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
        token.session_version = (user as Record<string, unknown>).session_version as string
      } else if (token.id && !token.session_version) {
        // Deploydən əvvəl yaradılmış JWT-ləri cari DB versiyası ilə möhürlə.
        const [dbUser] = await db.select({ updated_at: users.updated_at }).from(users)
          .where(eq(users.id, token.id as string)).limit(1)
        token.session_version = dbUser?.updated_at.toISOString()
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        // Active session revocation + rol/tenant-i DB-dən TƏZƏ oxu
        // (JWT-dəki köhnə rola güvənmə — icazə dəyişikliyi dərhal təsir etsin)
        const [dbUser] = await db
          .select({
            is_active: users.is_active,
            role: users.role,
            tenant_id: users.tenant_id,
            updated_at: users.updated_at,
          })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1)

        if (
          !dbUser ||
          !dbUser.is_active ||
          !isOperationalRole(dbUser.role) ||
          dbUser.updated_at.toISOString() !== token.session_version
        ) {
          // Force session logout by returning an empty session object
          return null as unknown as typeof session
        }

        session.user.id        = token.id as string
        session.user.role      = dbUser.role
        session.user.tenant_id = dbUser.tenant_id
      }
      return session
    },
  },
})
