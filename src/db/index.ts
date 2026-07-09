import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as authSchema from './schema/auth'
import * as checklistsSchema from './schema/checklists'

const schema = { ...authSchema, ...checklistsSchema }

const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle(sql, { schema })
export type DB = typeof db
