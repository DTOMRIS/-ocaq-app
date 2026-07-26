import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as authSchema from './schema/auth'
import * as checklistsSchema from './schema/checklists'
import * as qualityFormsSchema from './schema/quality-forms'

const schema = { ...authSchema, ...checklistsSchema, ...qualityFormsSchema }

export const sqlClient = neon(process.env.DATABASE_URL!)

export const db = drizzle(sqlClient, { schema })
export type DB = typeof db
