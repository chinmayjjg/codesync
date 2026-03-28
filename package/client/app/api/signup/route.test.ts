import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, create, hash, checkRateLimit } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  hash: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique,
      create,
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash,
  },
  hash,
}));

vi.mock("../../../lib/rateLimit", () => ({
  checkRateLimit,
}));

import { POST } from "./route";

describe("POST /api/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimit.mockReturnValue({ allowed: true, remaining: 9 });
  });

  it("creates a user for a valid signup request", async () => {
    findUnique.mockResolvedValue(null);
    hash.mockResolvedValue("hashed-password");
    create.mockResolvedValue({
      id: "user-1",
      email: "teammate@example.com",
      name: "Teammate",
    });

    const request = new Request("http://localhost:3000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "Teammate@Example.com",
        password: "password123",
        name: "  Teammate  ",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "teammate@example.com" },
    });
    expect(hash).toHaveBeenCalledWith("password123", 10);
    expect(create).toHaveBeenCalledWith({
      data: {
        email: "teammate@example.com",
        name: "Teammate",
        password: "hashed-password",
      },
    });
    expect(body).toEqual({
      message: "User created",
      user: {
        id: "user-1",
        email: "teammate@example.com",
        name: "Teammate",
      },
    });
  });

  it("rejects duplicate signup attempts", async () => {
    findUnique.mockResolvedValue({
      id: "existing-user",
      email: "teammate@example.com",
    });

    const request = new Request("http://localhost:3000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "teammate@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "User already exists" });
    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects invalid credentials before hitting the database", async () => {
    const request = new Request("http://localhost:3000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        password: "short",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid email" });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns 429 when the signup rate limit is exceeded", async () => {
    checkRateLimit.mockReturnValue({ allowed: false, retryAfterMs: 1000 });

    const request = new Request("http://localhost:3000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "teammate@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toEqual({ error: "Too many signup attempts" });
  });
});
