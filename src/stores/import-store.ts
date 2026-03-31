// ============================================================================
// Import Store (Zustand)
// Manages the 5-step import wizard state and file processing
// ============================================================================

import { create } from 'zustand';
import { FileEntry, ImportStatus } from '../types/index';

export type ImportStep = 1 | 2 | 3 | 4 | 5;

interface ImportStoreState {
  // State
  files: FileEntry[];
  activeFileIndex: number;
  currentStep: ImportStep;
  isProcessing: boolean;

  // Computed getters
  activeFile: FileEntry | null;
  analyzedFiles: FileEntry[];
  allCommitted: boolean;
  processedFilesCount: number;
  errorFilesCount: number;

  // Actions: File Management
  addFiles: (files: FileEntry[]) => void;
  removeFile: (fileId: string) => void;
  updateFile: (fileId: string, updates: Partial<FileEntry>) => void;
  setActiveFile: (fileIndex: number) => void;

  // Actions: Workflow
  setStep: (step: ImportStep) => void;
  setIsProcessing: (processing: boolean) => void;

  // Actions: Batch operations
  reset: () => void;
  commitAll: () => void;
  removeAllErrorFiles: () => void;
}

const initialState = {
  files: [],
  activeFileIndex: -1,
  currentStep: 1 as ImportStep,
  isProcessing: false,
};

export const useImportStore = create<ImportStoreState>((set, get) => ({
  // Initial state
  ...initialState,

  // ── Computed Getters ──

  get activeFile() {
    const state = get();
    return state.activeFileIndex >= 0 && state.activeFileIndex < state.files.length
      ? state.files[state.activeFileIndex]
      : null;
  },

  get analyzedFiles() {
    const state = get();
    return state.files.filter((f) => f.analysisResult !== undefined);
  },

  get allCommitted() {
    const state = get();
    return (
      state.files.length > 0 &&
      state.files.every((f) => f.status === 'committed')
    );
  },

  get processedFilesCount() {
    const state = get();
    return state.files.filter(
      (f) =>
        f.status === 'committed' ||
        f.status === 'previewed' ||
        f.status === 'mapped'
    ).length;
  },

  get errorFilesCount() {
    const state = get();
    return state.files.filter((f) => f.status === 'error').length;
  },

  // ── File Management Actions ──

  addFiles: (newFiles: FileEntry[]) =>
    set((state) => ({
      files: [...state.files, ...newFiles],
      // Automatically set first file as active if none is active
      activeFileIndex:
        state.activeFileIndex === -1 && newFiles.length > 0 ? 0 : state.activeFileIndex,
    })),

  removeFile: (fileId: string) =>
    set((state) => {
      const newFiles = state.files.filter((f) => f.id !== fileId);
      const fileIndex = state.files.findIndex((f) => f.id === fileId);

      // Adjust active file index if necessary
      let newActiveIndex = state.activeFileIndex;
      if (fileIndex === state.activeFileIndex) {
        // If removing active file, move to previous or next
        if (newFiles.length === 0) {
          newActiveIndex = -1;
        } else if (fileIndex > 0) {
          newActiveIndex = fileIndex - 1;
        } else {
          newActiveIndex = 0;
        }
      } else if (fileIndex < state.activeFileIndex) {
        // If removing a file before active, shift index down
        newActiveIndex = state.activeFileIndex - 1;
      }

      return {
        files: newFiles,
        activeFileIndex: newActiveIndex,
      };
    }),

  updateFile: (fileId: string, updates: Partial<FileEntry>) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, ...updates } : f
      ),
    })),

  setActiveFile: (fileIndex: number) =>
    set((state) => {
      if (fileIndex >= 0 && fileIndex < state.files.length) {
        return { activeFileIndex: fileIndex };
      }
      return {};
    }),

  // ── Workflow Actions ──

  setStep: (step: ImportStep) => set({ currentStep: step }),

  setIsProcessing: (processing: boolean) => set({ isProcessing: processing }),

  // ── Batch Operations ──

  reset: () => set(initialState),

  commitAll: () =>
    set((state) => ({
      files: state.files.map((f) => ({
        ...f,
        status: 'committed' as ImportStatus,
      })),
    })),

  removeAllErrorFiles: () =>
    set((state) => {
      const newFiles = state.files.filter((f) => f.status !== 'error');
      return {
        files: newFiles,
        activeFileIndex:
          newFiles.length === 0
            ? -1
            : Math.min(state.activeFileIndex, newFiles.length - 1),
      };
    }),
}));

// ── Helper Hooks ──

/**
 * Hook to get the next file in the queue
 */
export const useNextFile = () => {
  const { files, activeFileIndex } = useImportStore();
  const nextIndex = activeFileIndex + 1;
  return nextIndex < files.length ? files[nextIndex] : null;
};

/**
 * Hook to get progress stats
 */
export const useImportProgress = () => {
  const store = useImportStore();
  const total = store.files.length;
  const completed = store.processedFilesCount;
  const errors = store.errorFilesCount;

  return {
    total,
    completed,
    errors,
    pending: total - completed - errors,
    percentComplete: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
};

/**
 * Hook to batch update multiple files
 */
export const useBatchUpdateFiles = () => {
  const { updateFile } = useImportStore();

  return (updates: Array<{ id: string; partial: Partial<FileEntry> }>) => {
    updates.forEach(({ id, partial }) => updateFile(id, partial));
  };
};

/**
 * Hook to get files by status
 */
export const useFilesByStatus = (status: ImportStatus) => {
  const files = useImportStore((state) => state.files);
  return files.filter((f) => f.status === status);
};
