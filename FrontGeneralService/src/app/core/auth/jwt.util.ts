const TOKEN_PAYLOAD_INDEX = 1;
const JWT_MIN_SEGMENTS = 3;
const BASE64_URL_MINUS = /-/g;
const BASE64_URL_UNDERSCORE = /_/g;

export interface JwtPayload {
  preferred_username?: string;
  realm_access?: { roles?: string[] };
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < JWT_MIN_SEGMENTS) {
    return null;
  }
  try {
    const payload = parts[TOKEN_PAYLOAD_INDEX];
    const normalised = payload
      .replace(BASE64_URL_MINUS, '+')
      .replace(BASE64_URL_UNDERSCORE, '/');
    const bytes = Uint8Array.from(atob(normalised), c => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}
