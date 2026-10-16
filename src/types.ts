export interface Env {
	RATE_LIMITER: any;
	CRUX_API_KEY?: string;
}

export interface RateLimitInfo {
	allowed: boolean;
	retryAfter?: number;
}
