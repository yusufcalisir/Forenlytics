import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface JobProgress {
  stage_index: number;
  total_stages: number;
  stage_name: string;
  stage_key: string;
  engine: string;
  progress_pct: number;
  telemetry_log: string;
}

interface AppState {
  // Audio (Speaker Comparison)
  audioSpeakerResult: any | null;
  setAudioSpeakerResult: (data: any) => void;
  resetAudioSpeaker: () => void;

  // Audio (Deepfake Diagnostics)
  audioDeepfakeResult: any | null;
  setAudioDeepfakeResult: (data: any) => void;
  resetAudioDeepfake: () => void;

  // Reports
  reportData: any | null;
  setReportData: (data: any) => void;
  resetReport: () => void;

  // Background Jobs Tracking
  activeJobs: Record<string, string>;
  setActiveJob: (type: string, jobId: string) => void;
  clearActiveJob: (type: string) => void;

  // Real-Time Job Progress Tracking (streaming from backend)
  jobProgress: Record<string, JobProgress>;
  setJobProgress: (type: string, progress: JobProgress) => void;
  clearJobProgress: (type: string) => void;

  // Job Errors — surfaced from background job failures
  jobErrors: Record<string, string>;
  setJobError: (type: string, message: string) => void;
  clearJobError: (type: string) => void;

  // Global Session
  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      audioSpeakerResult: null,
      setAudioSpeakerResult: (data) => set({ audioSpeakerResult: data }),
      resetAudioSpeaker: () => set({ audioSpeakerResult: null }),

      audioDeepfakeResult: null,
      setAudioDeepfakeResult: (data) => set({ audioDeepfakeResult: data }),
      resetAudioDeepfake: () => set({ audioDeepfakeResult: null }),

      reportData: null,
      setReportData: (data) => set({ reportData: data }),
      resetReport: () => set({ reportData: null }),

      resetAll: () =>
        set({
          audioSpeakerResult: null,
          audioDeepfakeResult: null,
          reportData: null,
          activeJobs: {},
          jobProgress: {},
          jobErrors: {},
        }),

      activeJobs: {},
      setActiveJob: (type, jobId) => set((state) => ({ activeJobs: { ...state.activeJobs, [type]: jobId } })),
      clearActiveJob: (type) => set((state) => {
        const next = { ...state.activeJobs };
        delete next[type];
        return { activeJobs: next };
      }),

      jobProgress: {},
      setJobProgress: (type, progress) => set((state) => ({
        jobProgress: { ...state.jobProgress, [type]: progress }
      })),
      clearJobProgress: (type) => set((state) => {
        const next = { ...state.jobProgress };
        delete next[type];
        return { jobProgress: next };
      }),

      jobErrors: {},
      setJobError: (type, message) => set((state) => ({ jobErrors: { ...state.jobErrors, [type]: message } })),
      clearJobError: (type) => set((state) => {
        const next = { ...state.jobErrors };
        delete next[type];
        return { jobErrors: next };
      }),
    }),
    {
      name: "forenlytics-session-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        audioSpeakerResult: state.audioSpeakerResult,
        audioDeepfakeResult: state.audioDeepfakeResult,
        reportData: state.reportData,
      }),
    }
  )
);
