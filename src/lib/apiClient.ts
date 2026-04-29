const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const TIMEOUT_MS = 120000;
const SESSION_KEY = "forenlytics_session_id";

let memorySessionId: string | null = null;
let sessionPromise: Promise<string> | null = null;

/**
 * Session ID management — stored in sessionStorage to survive page refreshes.
 */
function getSessionId(): string | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return stored;
  }
  return memorySessionId;
}

function setSessionId(id: string): void {
  memorySessionId = id;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, id);
  }
}

/**
 * Ensures a valid session exists. Creates one if missing.
 */
async function ensureSession(): Promise<string> {
  let sid = getSessionId();
  if (sid) return sid;

  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/session`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to initialize session.");
      const data = await res.json();
      const newSid = data.session_id;
      setSessionId(newSid);
      return newSid;
    } finally {
      sessionPromise = null;
    }
  })();

  return sessionPromise;
}

/**
 * Builds headers with session ID attached.
 */
function sessionHeaders(extra?: Record<string, string>): Record<string, string> {
  const sid = getSessionId();
  const headers: Record<string, string> = { ...(extra || {}) };
  if (sid) headers["x-session-id"] = sid;
  return headers;
}

/**
 * Extracts session_id from response and stores it (handles new session creation from backend).
 */
function captureSession(body: any): void {
  if (body?.session_id) {
    setSessionId(body.session_id);
  }
}

/**
 * Wraps a fetch call with a timeout. Rejects if the request takes too long.
 */
async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. The server may be processing a large dataset.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extracts a human-readable error from a failed response.
 * Never exposes raw stack traces.
 */
async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body.detail || body.message || fallback;
  } catch {
    try {
      const text = await res.text();
      return text.length > 0 && text.length < 200 ? text : fallback;
    } catch {
      return fallback;
    }
  }
}

export const apiClient = {
  /**
   * Initialize session on app load. Call this early (e.g. in layout effect).
   */
  async initSession(): Promise<string> {
    return ensureSession();
  },

  async getJobStatus(jobId: string) {
    await ensureSession();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/job-status/${jobId}`, {
        headers: sessionHeaders(),
      });
      if (!res.ok) {
        const msg = await extractError(res, "Failed to get job status.");
        throw new Error(msg);
      }
      return res.json();
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the backend server. Please ensure it is running.");
      }
      throw err;
    }
  },

  async get(endpoint: string) {
    await ensureSession();
    try {
      const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
        headers: sessionHeaders(),
      });
      if (!res.ok) {
        const msg = await extractError(res, "Data could not be loaded. Please try again.");
        console.error(`[Forenlytics API] GET ${endpoint} failed: ${res.status} — ${msg}`);
        throw new Error(msg);
      }
      const body = await res.json();
      captureSession(body);
      return body;
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        console.error(`[Forenlytics API] Network error on GET ${endpoint}`);
        throw new Error("Cannot connect to the backend server. Please ensure it is running.");
      }
      throw err;
    }
  },

  async post(endpoint: string, payload: any) {
    await ensureSession();
    try {
      const res = await fetchWithTimeout(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await extractError(res, "Request failed. Please try again.");
        console.error(`[Forenlytics API] POST ${endpoint} failed: ${res.status} — ${msg}`);
        throw new Error(msg);
      }
      const body = await res.json();
      captureSession(body);
      return body;
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the backend server. Please ensure it is running.");
      }
      throw err;
    }
  },

  async uploadHts(file: File) {
    await ensureSession();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/upload-hts`, {
        method: "POST",
        headers: sessionHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const msg = await extractError(res, "HTS file upload failed.");
        console.error(`[Forenlytics API] HTS upload failed: ${res.status} — ${msg}`);
        throw new Error(msg);
      }
      const body = await res.json();
      captureSession(body);
      return body;
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the backend server. Please ensure it is running.");
      }
      throw err;
    }
  },

  async confirmHtsMapping(mapping: Record<string, string>) {
    await ensureSession();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/confirm-hts-mapping`, {
        method: "POST",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(mapping),
      });
      if (!res.ok) {
        const msg = await extractError(res, "Column mapping confirmation failed.");
        throw new Error(msg);
      }
      const body = await res.json();
      captureSession(body);
      return body;
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the backend server. Please ensure it is running.");
      }
      throw err;
    }
  },

  async confirmGpsMapping(mapping: Record<string, string>) {
    await ensureSession();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/confirm-gps-mapping`, {
        method: "POST",
        headers: sessionHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(mapping),
      });
      if (!res.ok) {
        const msg = await extractError(res, "Column mapping confirmation failed.");
        throw new Error(msg);
      }
      const body = await res.json();
      captureSession(body);
      return body;
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the backend server. Please ensure it is running.");
      }
      throw err;
    }
  },

  async uploadGps(file: File) {
    await ensureSession();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/upload-gps`, {
        method: "POST",
        headers: sessionHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const msg = await extractError(res, "GPS file upload failed.");
        console.error(`[Forenlytics API] GPS upload failed: ${res.status} — ${msg}`);
        throw new Error(msg);
      }
      const body = await res.json();
      captureSession(body);
      return body;
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the backend server. Please ensure it is running.");
      }
      throw err;
    }
  },

  async uploadAudioPair(file1: File, file2: File) {
    await ensureSession();
    const formData = new FormData();
    formData.append("audio_1", file1);
    formData.append("audio_2", file2);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/speaker-embedding-compare`, {
        method: "POST",
        headers: sessionHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const msg = await extractError(res, "Audio pair analysis failed.");
        console.error(`[Forenlytics API] Audio upload failed: ${res.status} — ${msg}`);
        throw new Error(msg);
      }
      return res.json();
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the backend server. Please ensure it is running (port 8000).");
      }
      throw err;
    }
  },

  async detectDeepfake(file: File) {
    await ensureSession();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetchWithTimeout(`${API_BASE}/deepfake-detect`, {
        method: "POST",
        headers: sessionHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const msg = await extractError(res, "Deepfake detection failed.");
        console.error(`[Forenlytics API] Deepfake scan failed: ${res.status} — ${msg}`);
        throw new Error(msg);
      }
      return res.json();
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the backend server. Please ensure it is running (port 8000).");
      }
      throw err;
    }
  },

  async downloadReport() {
    await ensureSession();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/download-report`, {
        headers: sessionHeaders(),
      });
      if (!res.ok) {
        console.error(`[Forenlytics API] PDF download failed: ${res.status}`);
        throw new Error("Failed to generate PDF. Ensure data has been uploaded to at least one module.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Forenlytics_Official_Docket.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the backend server. Please ensure it is running.");
      }
      throw err;
    }
  },
};
