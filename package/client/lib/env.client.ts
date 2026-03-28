function validateWsUrl(value: string, name: string) {
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

export function getClientEnv() {
  const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (configuredWsUrl?.trim()) {
    return {
      NEXT_PUBLIC_WS_URL: validateWsUrl(
        configuredWsUrl,
        "NEXT_PUBLIC_WS_URL"
      ),
    };
  }

  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    console.warn(
      "NEXT_PUBLIC_WS_URL is missing. Falling back to ws://localhost:8080 for local development."
    );
  }

  return {
    NEXT_PUBLIC_WS_URL: "ws://localhost:8080",
  };
}
