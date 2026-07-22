const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:5000/api";

async function request(
  endpoint,
  options = {}
) {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    data = {
      success: false,
      message:
        "The server returned an invalid response.",
    };
  }

  if (!response.ok) {
    const error = new Error(
      data.message || "Request failed."
    );

    error.status = response.status;
    error.errors = data.errors || [];

    throw error;
  }

  return data;
}

export function registerUser(userData) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export function loginUser(credentials) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function getCurrentUser(token) {
  return request("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function checkApiHealth() {
  return request("/health");
}

export function getWorkspaces(token) {
  return request("/workspaces", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createWorkspace(workspaceData, token) {
  return request("/workspaces", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(workspaceData),
  });
}

export function updateWorkspace(
  workspaceId,
  workspaceData,
  token
) {
  return request(`/workspaces/${workspaceId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(workspaceData),
  });
}

export function deleteWorkspace(workspaceId, token) {
  return request(`/workspaces/${workspaceId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
