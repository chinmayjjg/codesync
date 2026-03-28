const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export function isValidObjectId(value: string) {
  return OBJECT_ID_REGEX.test(value);
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

export function sanitizeSingleLineText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeOptionalSingleLineText(
  value: unknown,
  maxLength: number
) {
  const sanitized = sanitizeSingleLineText(value, maxLength);
  return sanitized || null;
}

export function sanitizeFileContent(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  if (value.length > maxLength) {
    return null;
  }

  return value.replace(/\u0000/g, "");
}

export async function parseJsonObject(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
