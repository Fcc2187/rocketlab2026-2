const baseUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      "Não foi possível conectar à API. Verifique sua conexão e tente novamente.",
    );
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    let message = "Não foi possível concluir a operação.";
    if (typeof data?.detail === "string") {
      message = data.detail;
    } else if (Array.isArray(data?.detail)) {
      const first = data.detail[0];
      if (first && typeof first === "object") {
        const detailMessage = typeof first.msg === "string" ? first.msg : null;
        const location = Array.isArray(first.loc)
          ? first.loc.filter((part: unknown) => part !== "body").join(".")
          : "";
        if (detailMessage)
          message = location ? `${location}: ${detailMessage}` : detailMessage;
      }
    }
    throw new ApiError(response.status, message);
  }
  return data as T;
}
