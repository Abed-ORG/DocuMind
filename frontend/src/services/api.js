const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://localhost:5000/api";

async function request(
  endpoint,
  options = {}
) {
  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        ...(!isFormData && {
          "Content-Type": "application/json",
        }),
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

export function getWorkspace(workspaceId, token) {
  return request(`/workspaces/${workspaceId}`, {
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

export function getDocuments(workspaceId, token) {
  return request(`/workspaces/${workspaceId}/documents`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function updateDocument(
  workspaceId,
  documentId,
  documentData,
  token
) {
  return request(
    `/workspaces/${workspaceId}/documents/${documentId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(documentData),
    }
  );
}

export function deleteDocument(
  workspaceId,
  documentId,
  token
) {
  return request(
    `/workspaces/${workspaceId}/documents/${documentId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export function uploadDocument(
  workspaceId,
  file,
  token,
  {
    documentName,
    onProgress,
  } = {}
) {
  const formData = new FormData();
  formData.append("file", file);

  if (documentName) {
    formData.append("originalName", documentName);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      `${API_BASE_URL}/workspaces/${workspaceId}/documents`
    );
    xhr.setRequestHeader(
      "Authorization",
      `Bearer ${token}`
    );

    xhr.upload.addEventListener(
      "progress",
      (event) => {
        if (!event.lengthComputable) {
          return;
        }

        onProgress?.(
          Math.round(
            (event.loaded / event.total) * 100
          )
        );
      }
    );

    xhr.addEventListener("load", () => {
      let data;

      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = {
          success: false,
          message:
            "The server returned an invalid response.",
        };
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const error = new Error(
          data.message || "Request failed."
        );

        error.status = xhr.status;
        error.errors = data.errors || [];

        reject(error);
        return;
      }

      onProgress?.(100);
      resolve(data);
    });

    xhr.addEventListener("error", () => {
      reject(
        new Error("Unable to upload document.")
      );
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Document upload was canceled."));
    });

    xhr.send(formData);
  });
}
