import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, compare } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  compare: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findUnique,
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare,
  },
  compare,
}));

import { authOptions } from "./auth";

function getAuthorize() {
  const provider = authOptions.providers[0] as unknown as {
    options: {
      authorize: (
        credentials?: Record<string, string>,
        request?: Record<string, unknown>
      ) => Promise<unknown>;
    };
  };

  return provider.options.authorize;
}

describe("authOptions credentials authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user for valid credentials", async () => {
    findUnique.mockResolvedValue({
      id: "user-1",
      email: "teammate@example.com",
      name: "Teammate",
      password: "stored-hash",
    });
    compare.mockResolvedValue(true);

    const authorize = getAuthorize();
    const result = await authorize(
      {
        email: "Teammate@Example.com",
        password: "password123",
      },
      {}
    );

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "teammate@example.com" },
    });
    expect(compare).toHaveBeenCalledWith("password123", "stored-hash");
    expect(result).toEqual({
      id: "user-1",
      email: "teammate@example.com",
      name: "Teammate",
    });
  });

  it("throws when credentials are missing", async () => {
    const authorize = getAuthorize();

    await expect(
      authorize({ email: "", password: "" }, {})
    ).rejects.toThrow("Invalid email or password");

    expect(findUnique).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
  });

  it("throws when the password does not match", async () => {
    findUnique.mockResolvedValue({
      id: "user-1",
      email: "teammate@example.com",
      name: "Teammate",
      password: "stored-hash",
    });
    compare.mockResolvedValue(false);

    const authorize = getAuthorize();

    await expect(
      authorize({
        email: "teammate@example.com",
        password: "wrong-password",
      }, {})
    ).rejects.toThrow("Invalid email or password");
  });
});
