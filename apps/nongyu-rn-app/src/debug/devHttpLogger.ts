import { attachJiaowuHttpLogger, type JiaowuHttpLogEvent } from "nongyu-tool-jiaowu";
import { attachSecondHttpLogger, type SecondHttpLogEvent } from "nongyu-tool-second";

const MAX_LOG_CHARS = 2048;
const SENSITIVE_KEY = /^(password|pwd|token|accesstoken|refreshtoken|cookie)$/i;

let installed = false;

type HttpLogEntry = {
  status: number | "-";
  durationMs: number;
  auth: "present" | "absent";
  cookie: "present" | "absent";
  token?: "present" | "absent";
  request?: string;
  response?: string;
  error?: string;
};

/**
 * 超长文本截断，并保留原文长度便于对照
 */
function truncate(text: string): string {
  if (text.length <= MAX_LOG_CHARS) return text;
  return `${text.slice(0, MAX_LOG_CHARS)}… [truncated, total=${text.length}]`;
}

/**
 * 对 JSON 对象中的敏感字段打码
 */
function redactUnknown(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redactUnknown);
  if (typeof value !== "object") return value;
  if (value instanceof ArrayBuffer) {
    return `[ArrayBuffer ${value.byteLength} bytes]`;
  }
  if (ArrayBuffer.isView(value)) {
    return `[${value.constructor.name} ${value.byteLength} bytes]`;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? "***" : redactUnknown(nested);
  }
  return out;
}

/**
 * 从文本里去掉 Bearer / Cookie / 表单密码等原文
 */
function redactSecretsInText(text: string): string {
  return text
    .replace(/Bearer\s+\S+/gi, "Bearer ***")
    .replace(/Cookie:\s*[^\n]+/gi, "Cookie: ***")
    .replace(/((?:password|pwd|token|accessToken|refreshToken|cookie)=)([^&]*)/gi, "$1***");
}

/**
 * 将请求/响应体变成可打印字符串（脱敏 + 截断）
 */
function formatBody(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return "[FormData]";
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return `[Blob ${value.size} bytes]`;
  }

  let prepared: unknown = value;
  if (typeof value === "string") {
    try {
      prepared = JSON.parse(value);
    } catch {
      return truncate(redactSecretsInText(value));
    }
  }

  const redacted = redactUnknown(prepared);
  if (typeof redacted === "string") {
    return truncate(redactSecretsInText(redacted));
  }
  try {
    return truncate(JSON.stringify(redacted));
  } catch {
    return truncate(String(redacted));
  }
}

/**
 * 打印一条 [HTTP] 日志；自身异常必须吞掉
 */
function printHttpLog(ok: boolean, method: string, url: string, entry: HttpLogEntry): void {
  try {
    console.log(`[HTTP] ${ok ? "OK" : "FAIL"} ${method} ${url}`, entry);
  } catch {
    // 日志失败不得影响原请求
  }
}

/**
 * 解析 fetch 入参中的 URL
 */
function resolveFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * 解析 fetch 方法
 */
function resolveFetchMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input === "object" && !(input instanceof URL) && "method" in input && input.method) {
    return input.method.toUpperCase();
  }
  return "GET";
}

/**
 * 合并 fetch headers，只用于判断鉴权头是否存在
 */
function resolveFetchHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (typeof input === "object" && !(input instanceof URL) && "headers" in input) {
    input.headers.forEach((value, key) => {
      if (!headers.has(key)) headers.set(key, value);
    });
  }
  return headers;
}

/**
 * 读取 fetch 请求体；不消费 Request.body 流
 */
function resolveFetchBody(init?: RequestInit): unknown {
  const body = init?.body;
  if (body == null || body === "") return undefined;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

/**
 * clone 响应后读取 body，避免消耗调用方的流
 */
async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  try {
    const cloned = response.clone();
    if (contentType.includes("application/json")) {
      return await cloned.json();
    }
    return await cloned.text();
  } catch {
    return `[unreadable body, type=${contentType || "unknown"}]`;
  }
}

/**
 * 包装全局 fetch：成功失败都打日志，不改变返回值
 */
function wrapGlobalFetch(): void {
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const startedAt = Date.now();
    const method = resolveFetchMethod(input, init);
    const url = resolveFetchUrl(input);
    const headers = resolveFetchHeaders(input, init);
    const requestBody = formatBody(resolveFetchBody(init));

    const baseEntry = {
      durationMs: 0,
      auth: headers.has("Authorization") ? ("present" as const) : ("absent" as const),
      cookie: headers.has("Cookie") ? ("present" as const) : ("absent" as const),
      ...(requestBody ? { request: requestBody } : {}),
    };

    return originalFetch(input, init).then(
      (response) => {
        void readResponseBody(response)
          .then((body) => {
            printHttpLog(response.ok, method, url, {
              ...baseEntry,
              status: response.status,
              durationMs: Date.now() - startedAt,
              response: formatBody(body),
            });
          })
          .catch(() => {
            printHttpLog(response.ok, method, url, {
              ...baseEntry,
              status: response.status,
              durationMs: Date.now() - startedAt,
              error: "failed to read response body",
            });
          });
        return response;
      },
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        printHttpLog(false, method, url, {
          ...baseEntry,
          status: "-",
          durationMs: Date.now() - startedAt,
          error: redactSecretsInText(message),
        });
        throw error;
      },
    );
  };
}

/**
 * 将教务 axios 结算事件转成与 fetch 相同的控制台格式
 */
function logJiaowuEvent(event: JiaowuHttpLogEvent): void {
  const request = formatBody(event.requestBody);
  const response = formatBody(event.responseBody);
  printHttpLog(event.ok, event.method, event.url, {
    status: event.status ?? "-",
    durationMs: event.durationMs,
    auth: event.hasAuthorization ? "present" : "absent",
    cookie: event.hasCookie ? "present" : "absent",
    ...(request ? { request } : {}),
    ...(response ? { response } : {}),
    ...(event.errorMessage ? { error: redactSecretsInText(event.errorMessage) } : {}),
  });
}

/**
 * 将二课 axios 结算事件转成相同控制台格式
 */
function logSecondEvent(event: SecondHttpLogEvent): void {
  const request = formatBody(event.requestBody);
  const response = formatBody(event.responseBody);
  printHttpLog(event.ok, event.method, event.url, {
    status: event.status ?? "-",
    durationMs: event.durationMs,
    auth: "absent",
    cookie: "absent",
    token: event.hasToken ? "present" : "absent",
    ...(request ? { request } : {}),
    ...(response ? { response } : {}),
    ...(event.errorMessage ? { error: redactSecretsInText(event.errorMessage) } : {}),
  });
}

/**
 * 仅 __DEV__ 安装；重复调用幂等。生产构建调用方不应进入此函数。
 */
export function installDevHttpLogger(): void {
  if (!__DEV__ || installed) return;
  installed = true;
  wrapGlobalFetch();
  attachJiaowuHttpLogger(logJiaowuEvent);
  attachSecondHttpLogger(logSecondEvent);
}
