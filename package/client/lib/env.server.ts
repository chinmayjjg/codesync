function requireEnv(name: string) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requireHttpUrl(name: string) {
  const value = requireEnv(name);

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
    return value;
  } catch {
    throw new Error(
      `Environment variable ${name} must be a valid http(s) URL`
    );
  }
}

function requireMongoUrl(name: string) {
  const value = requireEnv(name);

  if (!/^mongodb(\+srv)?:\/\//.test(value)) {
    throw new Error(
      `Environment variable ${name} must be a valid MongoDB connection string`
    );
  }

  return value;
}

export const serverEnv = {
  DATABASE_URL: requireMongoUrl("DATABASE_URL"),
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: requireHttpUrl("NEXTAUTH_URL"),
};
