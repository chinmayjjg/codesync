function requirePublicEnv(name: "NEXT_PUBLIC_WS_URL") {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
      throw new Error("Invalid protocol");
    }
    return value;
  } catch {
    throw new Error(
      `Environment variable ${name} must be a valid ws(s) URL`
    );
  }
}

export const clientEnv = {
  NEXT_PUBLIC_WS_URL: requirePublicEnv("NEXT_PUBLIC_WS_URL"),
};
