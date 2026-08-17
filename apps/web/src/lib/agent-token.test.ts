import { describe, expect, test } from "bun:test";
import { createOpaqueToken, hashOpaqueToken } from "./agent-token";

describe("agent credentials", () => {
  test("creates separate enrollment and device token namespaces", () => {
    expect(createOpaqueToken("wpe").startsWith("wpe_")).toBe(true);
    expect(createOpaqueToken("wpd").startsWith("wpd_")).toBe(true);
  });

  test("creates unique high-entropy tokens", () => {
    const tokens = new Set(
      Array.from({ length: 20 }, () => createOpaqueToken("wpd")),
    );
    expect(tokens.size).toBe(20);
    for (const token of tokens) expect(token.length > 40).toBe(true);
  });

  test("stores a deterministic one-way representation", () => {
    const token = createOpaqueToken("wpd");
    const hash = hashOpaqueToken(token);
    expect(hash.length).toBe(64);
    expect(hash.includes(token)).toBe(false);
    expect(hashOpaqueToken(token)).toBe(hash);
  });
});
