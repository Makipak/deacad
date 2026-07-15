const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  accessToken?: string | null;
}

function extractMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message: unknown }).message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  return fallback;
}

// Wrapper fetch tipis ke apps/api — `credentials: "include"` wajib supaya cookie httpOnly
// refresh_token (di-set backend di /auth/login|refresh) ikut terkirim (ARCHITECTURE.md #8).
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, accessToken, headers, ...rest } = options;
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(!isFormData && body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(response.status, extractMessage(payload, `Permintaan gagal (${response.status})`));
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
