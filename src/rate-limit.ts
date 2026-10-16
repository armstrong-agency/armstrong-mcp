import type { Env, RateLimitInfo } from './types';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function cleanupExpired() {
	const now = Date.now();
	for (const [key, value] of rateLimitStore.entries()) {
		if (now > value.resetAt) {
			rateLimitStore.delete(key);
		}
	}
}

export async function checkRateLimit(request: Request, env: Env, type: 'tools' | 'resources'): Promise<RateLimitInfo> {
	const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
	
	cleanupExpired();

	const limits = type === 'tools' 
		? { perMinute: 30, perDay: 500 }
		: { perMinute: 120, perDay: 10000 };

	const now = Date.now();
	const minuteKey = `${ip}:${type}:minute`;
	const dayKey = `${ip}:${type}:day`;

	const minuteData = rateLimitStore.get(minuteKey);
	const minuteResetAt = Math.floor(now / 60000) * 60000 + 60000;
	
	if (minuteData) {
		if (now < minuteData.resetAt) {
			if (minuteData.count >= limits.perMinute) {
				return {
					allowed: false,
					retryAfter: Math.ceil((minuteData.resetAt - now) / 1000),
				};
			}
			minuteData.count++;
		} else {
			rateLimitStore.set(minuteKey, { count: 1, resetAt: minuteResetAt });
		}
	} else {
		rateLimitStore.set(minuteKey, { count: 1, resetAt: minuteResetAt });
	}

	const dayData = rateLimitStore.get(dayKey);
	const dayResetAt = Math.floor(now / 86400000) * 86400000 + 86400000;
	
	if (dayData) {
		if (now < dayData.resetAt) {
			if (dayData.count >= limits.perDay) {
				return {
					allowed: false,
					retryAfter: 3600,
				};
			}
			dayData.count++;
		} else {
			rateLimitStore.set(dayKey, { count: 1, resetAt: dayResetAt });
		}
	} else {
		rateLimitStore.set(dayKey, { count: 1, resetAt: dayResetAt });
	}

	return { allowed: true };
}

