import type { Page, Route } from "@playwright/test";

interface MockApiRoute {
  method?: string;
  pathname: string | RegExp;
  handler: (route: Route) => Promise<void> | void;
}

function normalizeApiPath(pathname: string) {
  const normalized = pathname.replace(/^.*\/api\/v1/, "");
  return normalized.length > 0 ? normalized : "/";
}

function matchesPath(pathname: string, matcher: string | RegExp) {
  if (typeof matcher === "string") {
    return pathname === matcher;
  }

  return matcher.test(pathname);
}

export async function installMockApi(page: Page, routes: MockApiRoute[]) {
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = normalizeApiPath(url.pathname);

    const matchedRoute = routes.find((candidate) => {
      const methodMatches = !candidate.method || candidate.method === request.method();
      return methodMatches && matchesPath(pathname, candidate.pathname);
    });

    if (!matchedRoute) {
      await route.fulfill({
        status: 501,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "E2E_UNHANDLED_ROUTE",
            message: `No mock route configured for ${request.method()} ${pathname}`
          }
        })
      });
      return;
    }

    await matchedRoute.handler(route);
  });
}

export async function fulfillJson(
  route: Route,
  body: unknown,
  options: {
    status?: number;
    headers?: Record<string, string>;
  } = {}
) {
  await route.fulfill({
    status: options.status ?? 200,
    contentType: "application/json",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers":
        "Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
      ...options.headers
    },
    body: JSON.stringify(body)
  });
}

/**
 * Fulfills an audio route. Without options, returns a minimal silent WAV so the
 * <audio> element can load without firing onError. Pass status >= 400 to simulate
 * an audio load failure (triggers the onError → "Audio indisponivel" state).
 */
export async function fulfillAudio(
  route: Route,
  options: { status?: number } = {}
) {
  if (options.status && options.status >= 400) {
    await route.fulfill({ status: options.status });
    return;
  }

  // 44-byte RIFF/WAV: RIFF header + PCM fmt chunk + empty data chunk (0 samples)
  const wav = Buffer.alloc(44);
  let o = 0;
  wav.write("RIFF", o, "ascii"); o += 4;
  wav.writeUInt32LE(36, o); o += 4;          // file size - 8
  wav.write("WAVE", o, "ascii"); o += 4;
  wav.write("fmt ", o, "ascii"); o += 4;
  wav.writeUInt32LE(16, o); o += 4;          // PCM chunk size
  wav.writeUInt16LE(1, o); o += 2;           // PCM format = 1
  wav.writeUInt16LE(1, o); o += 2;           // channels = 1
  wav.writeUInt32LE(8000, o); o += 4;        // sample rate = 8kHz
  wav.writeUInt32LE(16000, o); o += 4;       // byte rate
  wav.writeUInt16LE(2, o); o += 2;           // block align
  wav.writeUInt16LE(16, o); o += 2;          // bits per sample
  wav.write("data", o, "ascii"); o += 4;
  wav.writeUInt32LE(0, o);                   // 0 bytes of audio data

  await route.fulfill({
    status: 200,
    headers: {
      "Content-Type": "audio/wav",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=900",
      "Access-Control-Allow-Origin": "*",
    },
    body: wav,
  });
}

export function buildPaginationMeta(options: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(Math.ceil(options.total / options.pageSize), 1);

  return {
    page: options.page,
    pageSize: options.pageSize,
    total: options.total,
    totalPages,
    hasNextPage: options.page < totalPages,
    hasPreviousPage: options.page > 1
  };
}
