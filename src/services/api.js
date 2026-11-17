const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export class ApiError extends Error {
  constructor(message, validationErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.validationErrors = validationErrors;
  }
}

export async function apiRequest(path, { token, method = "GET", body } = {}) {
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined && !(body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Could not reach the event API. Check that the Spring Boot server is running.",
    );
  }

  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      sessionStorage.removeItem("event-admin-token");
      window.dispatchEvent(new Event("event-admin-auth-expired"));
    }
    throw new ApiError(
      payload.message || `Request failed (${response.status})`,
      payload.validationErrors || {},
    );
  }

  return payload.data;
}

export async function apiBlobRequest(path, { token, method = "GET", body, headers: extraHeaders } = {}) {
  const headers = new Headers(extraHeaders);
  headers.set(
    "Accept",
    "application/pdf, image/*, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  if (token) headers.set("Authorization", "Bearer " + token);
  if (body !== undefined && !(body instanceof FormData)) headers.set("Content-Type", "application/json");

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Could not reach the event API. Check that the Spring Boot server is running.",
    );
  }

  if (!response.ok) {
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    if (response.status === 401 && token) {
      sessionStorage.removeItem("event-admin-token");
      window.dispatchEvent(new Event("event-admin-auth-expired"));
    }
    throw new ApiError(payload.message || `Request failed (${response.status})`);
  }

  return response.blob();
}
