import { PaperclipApiError } from "./client.js";

type McpTextResponse = {
  content: Array<{ type: "text"; text: string }>;
};

/**
 * Sensitive field-name keywords. A field is redacted if its lowercased
 * name contains any of these keywords as a substring.
 *
 * This catches compound names like "apiToken", "accessToken",
 * "refreshToken", "devicePrivateKeyPem", "devicePrivateKey", etc.
 *
 * The PR spec (JAC-5296 / PR #10284) requires case-insensitive matching.
 */
const SENSITIVE_FIELD_KEYWORDS = [
  "token",
  "authtoken",
  "privatekey",
  "apikey",
  "secret",
  "password",
  "passwd",
  "accesstoken",
  "refreshtoken",
  "auth",
  "credential",
];

function isSensitiveFieldName(name: string): boolean {
  const lower = name.toLowerCase();
  return SENSITIVE_FIELD_KEYWORDS.some((kw) => lower.includes(kw));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively redact sensitive fields from any value.
 *
 * - Objects: each property is checked; sensitive keys get "***REDACTED***"
 * - Arrays: each element is processed recursively
 * - Primitives: returned as-is
 */
export function redactSensitiveFields(value: unknown): unknown {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveFields(item));
  }
  if (!isPlainObject(value)) {
    return value;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (isSensitiveFieldName(key)) {
      redacted[key] = "***REDACTED***";
    } else {
      redacted[key] = redactSensitiveFields(fieldValue);
    }
  }
  return redacted;
}

export function formatTextResponse(value: unknown): McpTextResponse {
  const redacted = redactSensitiveFields(value);
  return {
    content: [
      {
        type: "text",
        text: typeof redacted === "string" ? redacted : JSON.stringify(redacted, null, 2),
      },
    ],
  };
}

export function formatErrorResponse(error: unknown): McpTextResponse {
  if (error instanceof PaperclipApiError) {
    return formatTextResponse({
      error: error.message,
      status: error.status,
      method: error.method,
      path: error.path,
      body: error.body,
    });
  }
  return formatTextResponse({
    error: error instanceof Error ? error.message : String(error),
  });
}
