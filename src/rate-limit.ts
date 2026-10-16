import type { Env, RateLimitInfo } from './types';

export async function checkRateLimit(request: Request, env: Env, type: 'tools' | 'resources'): Promise<RateLimitInfo> {
	const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
	
	if (!env.RATE_LIMITER) {
		return { allowed: true };
	}

	const limits = type === 'tools' 
		? { perMinute: 30, perDay: 500 }
		: { perMinute: 120, perDay: 10000 };

	try {
		const minuteKey = `${ip}:${type}:minute:${Math.floor(Date.now() / 60000)}`;
		const dayKey = `${ip}:${type}:day:${Math.floor(Date.now() / 86400000)}`;

		const minuteLimit = await env.RATE_LIMITER.limit({ key: minuteKey });
		if (!minuteLimit.success) {
			return {
				allowed: false,
				retryAfter: 60,
			};
		}

		const dayLimit = await env.RATE_LIMITER.limit({ key: dayKey });
		if (!dayLimit.success) {
			return {
				allowed: false,
				retryAfter: 3600,
			};
		}

		return { allowed: true };
	} catch (error) {
		console.error('Rate limit check failed:', error);
		return { allowed: true };
	}
}
