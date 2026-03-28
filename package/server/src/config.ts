function requireEnv(name: string) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requirePort(name: string) {
  const value = requireEnv(name);
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Environment variable ${name} must be a valid port number`);
  }

  return port;
}

export const serverConfig = {
  PORT: requirePort("PORT"),
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
};
