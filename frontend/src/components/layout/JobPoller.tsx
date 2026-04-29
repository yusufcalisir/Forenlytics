"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { apiClient } from "@/lib/apiClient";

/**
 * Global background job poller.
 * Mounted once in AppLayout — survives all route changes.
 * Polls every active job every 2 seconds and dispatches results to the Zustand store.
 */
export function JobPoller() {
  const pollingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable reference to the poll function that always reads latest store state
  const poll = useCallback(async () => {
    // Guard: don't overlap polls
    if (pollingRef.current) return;
    pollingRef.current = true;

    try {
      const state = useAppStore.getState();
      const jobs = { ...state.activeJobs };
      const jobTypes = Object.keys(jobs);

      if (jobTypes.length === 0) return;

      for (const type of jobTypes) {
        const jobId = jobs[type];
        if (!jobId) continue;

        try {
          const status = await apiClient.getJobStatus(jobId);

          if (status.status === "completed") {
            const result = status.result;
            handleJobCompleted(type, result);
            useAppStore.getState().clearActiveJob(type);
            useAppStore.getState().clearJobError(type);
          } else if (status.status === "failed") {
            console.error(`[JobPoller] Job ${type} (${jobId}) failed:`, status.error);
            useAppStore.getState().setJobError(type, status.error || "Job failed");
            useAppStore.getState().clearActiveJob(type);
          }
          // "pending" and "running" — keep polling
        } catch (err) {
          console.error(`[JobPoller] Error polling job ${type} (${jobId}):`, err);
        }
      }
    } finally {
      pollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(poll, 800);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  return null;
}

/**
 * Dispatches completed job results to the correct store slices.
 * Also registers orchestrator jobs (timeline/report) when primary jobs complete.
 */
function handleJobCompleted(type: string, result: any) {
  const store = useAppStore.getState();

  switch (type) {
    case "hts_upload":
    case "hts_mapping": {
      if (result.status === "needs_mapping") {
        store.setHtsMappingData(result);
      } else {
        // Analysis succeeded — fetch the graph data
        fetchHtsAnalysis();
      }
      // Register orchestrator jobs if present
      registerOrchestratorJobs(result);
      break;
    }

    case "gps_upload":
    case "gps_mapping": {
      if (result.status === "needs_mapping") {
        store.setGpsMappingData(result);
      } else {
        // Analysis succeeded — fetch the analysis data
        fetchGpsAnalysis();
      }
      // Register orchestrator jobs if present
      registerOrchestratorJobs(result);
      break;
    }

    case "audio_compare": {
      store.setAudioSpeakerResult(result);
      break;
    }

    case "audio_deepfake": {
      store.setAudioDeepfakeResult(result);
      break;
    }

    case "timeline": {
      // Timeline generation completed — store result directly
      if (result && !result.error) {
        store.setTimelineData(result);
      } else if (result?.error === "NO_DATA") {
        // No data yet, that's fine
        store.setTimelineData(null);
      }
      break;
    }

    case "report": {
      // Report generation completed — store result directly
      if (result && !result.error) {
        store.setReportData(result);
      }
      break;
    }

    default:
      console.warn(`[JobPoller] Unknown job type completed: ${type}`);
  }
}

/**
 * When a primary analysis job (HTS/GPS) completes, the result may contain
 * orchestrator_jobs = { timeline: "job-id", report: "job-id" }.
 * Register these in activeJobs so the poller picks them up.
 */
function registerOrchestratorJobs(result: any) {
  if (!result?.orchestrator_jobs) return;

  const store = useAppStore.getState();
  const orch = result.orchestrator_jobs;

  // Clear stale timeline/report data since new orchestrator run is starting
  store.setTimelineData(null);
  store.setReportData(null);

  if (orch.timeline) {
    store.setActiveJob("timeline", orch.timeline);
  }
  if (orch.report) {
    store.setActiveJob("report", orch.report);
  }
}

/**
 * Fetch HTS analysis after job completion and store it.
 */
async function fetchHtsAnalysis() {
  try {
    const graphData = await apiClient.get("/hts-graph");
    const store = useAppStore.getState();
    store.setHtsAnalysisData(graphData);
    store.setHtsMappingData(null);
  } catch (e) {
    console.error("[JobPoller] Failed to load HTS analysis after job completion", e);
    useAppStore.getState().setJobError("hts_upload", "Analysis completed but failed to load results.");
  }
}

/**
 * Fetch GPS analysis after job completion and store it.
 */
async function fetchGpsAnalysis() {
  try {
    const gpsData = await apiClient.get("/gps-analysis");
    const store = useAppStore.getState();
    store.setGpsAnalysisData(gpsData);
    store.setGpsMappingData(null);
  } catch (e) {
    console.error("[JobPoller] Failed to load GPS analysis after job completion", e);
    useAppStore.getState().setJobError("gps_upload", "Analysis completed but failed to load results.");
  }
}
