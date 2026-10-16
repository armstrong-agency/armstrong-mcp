export interface Env {
	CRUX_API_KEY?: string;
}

export interface RateLimitInfo {
	allowed: boolean;
	retryAfter?: number;
}
