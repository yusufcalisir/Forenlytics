import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface MappingData {
  detected_columns: Array<{
    original: string;
    mapped_to: string | null;
    samples: string[];
  }>;
  required_columns: string[];
  auto_mapping: Record<string, string>;
  missing: string[];
  profile_name?: string;
  confidence?: number;
}

interface AppState {
  // HTS
  htsAnalysisData: any | null;
  htsMappingData: MappingData | null;
  setHtsAnalysisData: (data: any) => void;
  setHtsMappingData: (data: MappingData | null) => void;
  resetHts: () => void;

  // GPS
  gpsAnalysisData: any | null;
  gpsMappingData: MappingData | null;
  setGpsAnalysisData: (data: any) => void;
  setGpsMappingData: (data: MappingData | null) => void;
  resetGps: () => void;

  // Audio (Speaker)
  audioSpeakerResult: any | null;
  setAudioSpeakerResult: (data: any) => void;
  resetAudioSpeaker: () => void;

  // Audio (Deepfake)
  audioDeepfakeResult: any | null;
  setAudioDeepfakeResult: (data: any) => void;
  resetAudioDeepfake: () => void;

  // Timeline
  timelineData: any | null;
  setTimelineData: (data: any) => void;
  resetTimeline: () => void;

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
    (set, get) => ({
      htsAnalysisData: null,
      htsMappingData: null,
      setHtsAnalysisData: (data) => set({ htsAnalysisData: data }),
      setHtsMappingData: (data) => set({ htsMappingData: data }),
      resetHts: () => set({ htsAnalysisData: null, htsMappingData: null }),

      gpsAnalysisData: null,
      gpsMappingData: null,
      setGpsAnalysisData: (data) => set({ gpsAnalysisData: data }),
      setGpsMappingData: (data) => set({ gpsMappingData: data }),
      resetGps: () => set({ gpsAnalysisData: null, gpsMappingData: null }),

      audioSpeakerResult: null,
      setAudioSpeakerResult: (data) => set({ audioSpeakerResult: data }),
      resetAudioSpeaker: () => set({ audioSpeakerResult: null }),

      audioDeepfakeResult: null,
      setAudioDeepfakeResult: (data) => set({ audioDeepfakeResult: data }),
      resetAudioDeepfake: () => set({ audioDeepfakeResult: null }),

      timelineData: null,
      setTimelineData: (data) => set({ timelineData: data }),
      resetTimeline: () => set({ timelineData: null }),

      reportData: null,
      setReportData: (data) => set({ reportData: data }),
      resetReport: () => set({ reportData: null }),

      resetAll: () =>
        set({
          htsAnalysisData: null,
          htsMappingData: null,
          gpsAnalysisData: null,
          gpsMappingData: null,
          audioSpeakerResult: null,
          audioDeepfakeResult: null,
          timelineData: null,
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
