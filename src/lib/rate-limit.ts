import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type LimitResult = Awaited<ReturnType<Ratelimit['limit']>>
type SafeLimiter = {
  limit: (identifier: string) => Promise<LimitResult | { success: true }>
}

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

function createLimiter(prefix: string, requests: number, window: `${number} ${'m' | 'h'}`): SafeLimiter {
  if (!redis) {
    return {
      async limit() {
        return { success: true }
      },
    }
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
        return { success: true }
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
