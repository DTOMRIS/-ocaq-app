import { defineConfig } from 'drizzle-kit'
import { readFileSync } from 'fs'

// DATABASE_URL env-də yoxdursa .env.local-dan oxu (shell tırnak/pooler dərdi olmasın).
// .env.local .gitignore-dadır → secret commit olmur.
let url = process.env.DATABASE_URL
if (!url) {
  try {
    const m = readFileSync('.env.local', 'utf8').match(/^\s*DATABASE_URL\s*=\s*(.*)$/m)
    if (m) url = m[1].trim().replace(/^["']|["']$/g, '')
  } catch { /* .env.local yoxdur */ }
}

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: url!,
  },
})
