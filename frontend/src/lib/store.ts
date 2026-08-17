import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
          jobErrors: {},
        }),

      activeJobs: {},
      setActiveJob: (type, jobId) => set((state) => ({ activeJobs: { ...state.activeJobs, [type]: jobId } })),
      clearActiveJob: (type) => set((state) => {
        const next = { ...state.activeJobs };
        delete next[type];
        return { activeJobs: next };
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
    }
  )
);
