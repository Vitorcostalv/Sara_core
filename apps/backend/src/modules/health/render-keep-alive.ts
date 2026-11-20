export class RenderKeepAlive {
  private lastAttempt = -Infinity;
  constructor(
    private readonly config: () => { enabled: boolean; baseUrl: string | null },
    private readonly request: typeof fetch = (...args) => fetch(...args),
    private readonly now: () => number = Date.now,
  ) {}
  async ping(): Promise<"disabled" | "sent" | "cooldown" | "failed"> {
    const config = this.config();
    if (!config.enabled || !config.baseUrl) return "disabled";
    if (this.now() - this.lastAttempt < 240_000) return "cooldown";
    this.lastAttempt = this.now();
    try {
      const url = new URL(config.baseUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "failed";
      url.pathname = `${url.pathname.replace(/\/+$/, "").replace(/\/v1$/, "")}/health`;
      url.search = ""; url.hash = "";
      const response = await this.request(url, { redirect: "error", signal: AbortSignal.timeout(8_000) });
      await response.body?.cancel();
      return response.ok ? "sent" : "failed";
    } catch { return "failed"; }
  }
}
