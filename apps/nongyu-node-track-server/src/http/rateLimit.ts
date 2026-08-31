/** 令牌桶限流，对齐 Go middleware 默认量级。 */

type Bucket = { tokens: number; last: number };

export class Limiter {
  private buckets = new Map<string, Bucket>();
  private rate: number;
  private burst: number;

  constructor(perMin: number) {
    this.rate = perMin / 60;
    this.burst = perMin / 6;
  }

  allow(key: string): boolean {
    const now = Date.now();
    let b = this.buckets.get(key);
    if (!b) {
      b = { tokens: this.burst, last: now };
      this.buckets.set(key, b);
    }
    const elapsed = (now - b.last) / 1000;
    b.tokens += elapsed * this.rate;
    if (b.tokens > this.burst) b.tokens = this.burst;
    b.last = now;
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }
}

export function clientIP(headers: Record<string, unknown>, remoteAddress?: string): string {
  const xff = headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0]!.trim();
  }
  return remoteAddress ?? "unknown";
}
