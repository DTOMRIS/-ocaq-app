import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id:        string
      role:      string
      tenant_id: string
      must_change_password: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:        string
    role:      string
    tenant_id: string
    must_change_password: boolean
    session_version?: string
  }
}
