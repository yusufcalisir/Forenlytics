// In production, all API calls go through Next.js rewrites (/api/backend/* → Render)
// This eliminates CORS issues entirely since the browser only talks to same-origin.
const API_BASE = "/api/backend";

if (typeof window !== "undefined") {
  console.log("[Forenlytics Audio API] Initialized with proxy BASE:", API_BASE);
}
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
  const sid = getSessionId();
  if (sid) return sid;

  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/session`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to initialize forensic session.");
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
 * Extracts session_id from response and stores it.
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
      throw new Error("Request timed out. The server may be processing heavy audio models.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extracts a human-readable error from a failed response.
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
   * Initialize session on app load.
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
      // 502 Bad Gateway / 503 Service Unavailable / 504 Gateway Timeout:
      // Upstream server (e.g. Render) is under heavy CPU load running models or spinning up.
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        return { job_id: jobId, status: "running" };
      }
      if (!res.ok) {
        const msg = await extractError(res, "Failed to get job status.");
        throw new Error(msg);
      }
      return res.json();
    } catch (err: any) {
      if (err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("Failed to fetch"))) {
        // Transient network blip during heavy CPU compute — report running
        return { job_id: jobId, status: "running" };
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
        console.error(`[Forenlytics Audio API] GET ${endpoint} failed: ${res.status} — ${msg}`);
        throw new Error(msg);
      }
      const body = await res.json();
      captureSession(body);
      return body;
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        console.error(`[Forenlytics Audio API] Network error on GET ${endpoint}`);
        throw new Error("Cannot connect to the audio forensics backend server.");
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
        console.error(`[Forenlytics Audio API] POST ${endpoint} failed: ${res.status} — ${msg}`);
        throw new Error(msg);
      }
      const body = await res.json();
      captureSession(body);
      return body;
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the audio forensics backend server.");
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
        console.error(`[Forenlytics Audio API] Audio upload failed: ${res.status} — ${msg}`);
        throw new Error(msg);
      }
      return res.json();
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the audio forensics backend server (port 8000).");
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
        console.error(`[Forenlytics Audio API] Deepfake scan failed: ${res.status} — ${msg}`);
        throw new Error(msg);
      }
      return res.json();
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the audio forensics backend server (port 8000).");
      }
      throw err;
    }
  },

  async getEvaluationResults() {
    return this.get("/evaluation-results");
  },

  async downloadReport() {
    await ensureSession();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/download-report`, {
        headers: sessionHeaders(),
      });
      if (!res.ok) {
        console.error(`[Forenlytics Audio API] PDF download failed: ${res.status}`);
        throw new Error("Failed to generate PDF docket. Ensure an audio analysis has been performed.");
      }

      const blob = await res.blob();

      // Check if running inside Electron Desktop App
      if (typeof window !== "undefined" && (window as any).electronAPI?.saveReportDialog) {
        const arrayBuffer = await blob.arrayBuffer();
        const saveRes = await (window as any).electronAPI.saveReportDialog(
          Array.from(new Uint8Array(arrayBuffer)),
          "Forenlytics_Adli_Ses_Raporu.pdf"
        );
        if (saveRes?.success) {
          console.log("[Forenlytics Desktop] Report saved to:", saveRes.path);
          return saveRes;
        } else if (saveRes?.canceled) {
          return { canceled: true };
        }
      }

      // Standard browser download fallback
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Forenlytics_Adli_Ses_Raporu.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Cannot connect to the audio forensics backend server.");
      }
      throw err;
    }
  },
};
