import { create } from 'zustand';
import { ImportState, Step, ImportFile, ImportData } from '../types';

interface ImportStoreState extends ImportState {
  setCurrentStep: (step: Step) => void;
  addFile: (file: ImportFile) => void;
  updateFile: (fileId: string, updates: Partial<ImportFile>) => void;
  removeFile: (fileId: string) => void;
  setData: (data: ImportData | null) => void;
  setAiReport: (report: string) => void;
  setPricelistName: (name: string) => void;
  reset: () => void;
}

const initialState: ImportState = {
  currentStep: 'upload',
  files: [],
  data: null,
  aiReport: '',
  pricelistName: '',
};

export const useImportStore = create<ImportStoreState>((set) => ({
  ...initialState,

  setCurrentStep: (step: Step) => set({ currentStep: step }),

  addFile: (file: ImportFile) =>
    set((state) => ({ files: [...state.files, file] })),

  updateFile: (fileId: string, updates: Partial<ImportFile>) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, ...updates } : f)),
    })),

  removeFile: (fileId: string) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
    })),

  setData: (data: ImportData | null) => set({ data }),

  setAiReport: (report: string) => set({ aiReport: report }),

  setPricelistName: (name: string) => set({ pricelistName: name }),

  reset: () => set(initialState),
}));
