const SENSITIVE_KEYS = new Set([
  'authorization', 'auth', 'token', 'api_key', 'apikey',
  'secret', 'password', 'passwd', 'pwd', 'session',
  'cookie', 'jwt', 'bearer', 'private_key',
  'access_token', 'refresh_token', 'client_secret',
]);

const PATTERNS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]'],
  [/eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, '[JWT_REDACTED]'],
  [/sk-[A-Za-z0-9]{20,}/g, '[API_KEY_REDACTED]'],
  [/ghp_[A-Za-z0-9]{36}/g, '[GITHUB_TOKEN_REDACTED]'],
  [/AKIA[0-9A-Z]{16}/g, '[AWS_KEY_REDACTED]'],
];

export function sanitizeString(text: string): string {
  let out = text;
  for (const [pat, rep] of PATTERNS) {
    out = out.replace(pat, rep);
  }
  return out;
}

export function sanitize(data: any, depth: number = 0): any {
  if (depth > 8) return '[MAX_DEPTH]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return sanitizeString(data).slice(0, 8000);
  }
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.slice(0, 50).map((x) => sanitize(x, depth + 1));
  }
  if (typeof data === 'object') {
    // Handle Errors
    if (data instanceof Error) {
      return {
        name: data.name,
        message: sanitizeString(data.message).slice(0, 1000),
        stack: sanitizeString(data.stack || '').slice(0, 20000),
      };
    }
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitize(v, depth + 1);
      }
    }
    return out;
  }
  return sanitizeString(String(data)).slice(0, 2000);
}
