"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { apiClient } from "@/lib/apiClient";

/**
 * Global background job poller for audio forensic jobs.
 * Mounted in AppLayout — survives all route changes.
 * Polls active jobs rapidly (every 350ms) to stream real-time pipeline execution progress
 * and dispatches results to the Zustand store upon completion.
 */
export function JobPoller() {
  const pollingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureCounts = useRef<Record<string, number>>({});

  const poll = useCallback(async () => {
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
          failureCounts.current[type] = 0;

          // Stream real-time stage progress from backend
          if (status.progress) {
            useAppStore.getState().setJobProgress(type, status.progress);
          }

          if (status.status === "completed") {
            const result = status.result;
            handleJobCompleted(type, result);
            useAppStore.getState().clearActiveJob(type);
            useAppStore.getState().clearJobProgress(type);
            useAppStore.getState().clearJobError(type);
          } else if (status.status === "failed") {
            console.error(`[JobPoller] Job ${type} (${jobId}) failed:`, status.error);
            useAppStore.getState().setJobError(type, status.error || "Audio forensic job failed");
            useAppStore.getState().clearActiveJob(type);
            useAppStore.getState().clearJobProgress(type);
          }
        } catch (err: any) {
          const errMsg = err?.message || "";
          if (errMsg.includes("not found") || errMsg.includes("404")) {
            console.warn(`[JobPoller] Job ${type} (${jobId}) no longer exists on server. Clearing.`);
            useAppStore.getState().clearActiveJob(type);
            useAppStore.getState().clearJobProgress(type);
            delete failureCounts.current[type];
          } else {
            console.error(`[JobPoller] Error polling job ${type} (${jobId}):`, err);
            failureCounts.current[type] = (failureCounts.current[type] || 0) + 1;

            if (failureCounts.current[type] > 40) {
              console.warn(`[JobPoller] Clearing stuck job ${type} after repeated failures.`);
              useAppStore.getState().setJobError(type, "Lost connection to background audio processor.");
              useAppStore.getState().clearActiveJob(type);
              useAppStore.getState().clearJobProgress(type);
              delete failureCounts.current[type];
            }
          }
        }
      }
    } finally {
      pollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Fast polling interval (350ms) to ensure smooth live stage transitions
    intervalRef.current = setInterval(poll, 350);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  return null;
}

/**
 * Dispatches completed audio job results to the Zustand store.
 */
function handleJobCompleted(type: string, result: any) {
  const store = useAppStore.getState();

  switch (type) {
    case "audio_compare": {
      store.setAudioSpeakerResult(result);
      break;
    }

    case "audio_deepfake": {
      store.setAudioDeepfakeResult(result);
      break;
    }

    case "report": {
      if (result && !result.error) {
        store.setReportData(result);
      }
      break;
    }

    default:
      console.warn(`[JobPoller] Unknown job type completed: ${type}`);
  }
}
