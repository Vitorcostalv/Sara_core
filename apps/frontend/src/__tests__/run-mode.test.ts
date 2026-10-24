import { describe, expect, it } from "vitest";
import { chooseDefaultRunMode } from "../demo/run-mode";

describe("hosted generation mode", () => {
  it("uses the deployed same-origin API on a phone instead of forcing snapshots", () => {
    expect(chooseDefaultRunMode("sara-core-one.vercel.app", "/api/v1")).toBe("auto");
  });
  it("accepts an explicitly configured HTTPS backend", () => {
    expect(chooseDefaultRunMode("sara.example", "https://api.sara.example/api/v1")).toBe("auto");
  });
  it("keeps static-only deployments offline when their API still points to localhost", () => {
    expect(chooseDefaultRunMode("sara.example", "http://localhost:3333/api/v1")).toBe("offline");
    expect(chooseDefaultRunMode("sara.example", "")).toBe("offline");
  });
  it("preserves local and LAN development", () => {
    expect(chooseDefaultRunMode("localhost", "http://localhost:3333/api/v1")).toBe("auto");
    expect(chooseDefaultRunMode("192.168.0.10", "/api/v1")).toBe("auto");
  });
});
