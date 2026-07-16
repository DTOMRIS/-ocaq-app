import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type LimitResult = Awaited<ReturnType<Ratelimit['limit']>>
type SafeLimiter = {
  limit: (identifier: string) => Promise<LimitResult | { success: boolean }>
}

const memoryWindows = new Map<string, { count: number; resetsAt: number }>()

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const hasRedisConfig =
  Boolean(redisUrl && redisToken) &&
  !redisUrl?.includes('xxx.upstash.io') &&
  !redisToken?.toLowerCase().includes('token')

const redis = hasRedisConfig
  ? new Redis({
      url:   redisUrl!,
      token: redisToken!,
    })
  : null

function createMemoryLimiter(prefix: string, requests: number, window: `${number} ${'m' | 'h'}`): SafeLimiter {
  const [amount, unit] = window.split(' ') as [`${number}`, 'm' | 'h']
  const windowMs = Number(amount) * (unit === 'h' ? 60 * 60_000 : 60_000)
  return {
    async limit(identifier: string) {
      const now = Date.now()
      const key = `${prefix}:${identifier}`
      const current = memoryWindows.get(key)
      if (!current || current.resetsAt <= now) {
        memoryWindows.set(key, { count: 1, resetsAt: now + windowMs })
        return { success: true }
      }
      current.count += 1
      return { success: current.count <= requests }
    },
  }
}

function createLimiter(
  prefix: string,
  requests: number,
  window: `${number} ${'m' | 'h'}`,
  failClosed = false,
): SafeLimiter {
  if (!redis) {
    return createMemoryLimiter(prefix, requests, window)
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix,
  })

  return {
    async limit(identifier: string) {
      try {
        return await limiter.limit(identifier)
      } catch {
        return { success: !failClosed }
      }
    },
  }
}

// Giriş: 5 cəhd / 15 dəqiqə
export const loginRateLimit = createLimiter('ocaq:login', 5, '15 m')

// Dəvət göndər: 10 / saat (admin)
export const inviteRateLimit = createLimiter('ocaq:invite', 10, '1 h')

// Şifrə sıfırla: 3 / saat
export const resetRateLimit = createLimiter('ocaq:reset', 3, '1 h')

// Checklist sübutu: hər istifadəçi üçün 20 foto / 15 dəqiqə
export const checklistPhotoRateLimit = createLimiter('ocaq:checklist-photo', 20, '15 m', true)
