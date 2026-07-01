export type DebouncedSerialSaver<T> = {
  schedule: (value: T) => void;
  flush: () => Promise<void>;
  cancel: () => void;
};

/**
 * Debounces writes and serializes overlapping saves so only the latest value
 * is persisted after in-flight requests complete.
 */
export function createDebouncedSerialSaver<T>(options: {
  delayMs: number;
  save: (value: T) => Promise<{ success: boolean; error?: string }>;
  onError?: (message: string) => void;
}): DebouncedSerialSaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latestValue: T | undefined;
  let version = 0;
  let savedVersion = 0;
  let saving = false;

  async function persistLatest(): Promise<void> {
    if (saving || latestValue === undefined || savedVersion >= version) return;

    saving = true;
    const targetVersion = version;
    const value = latestValue;

    try {
      const result = await options.save(value);
      if (!result.success) {
        options.onError?.(result.error ?? "Errore salvataggio");
        return;
      }
      savedVersion = targetVersion;
    } finally {
      saving = false;
      if (savedVersion < version) {
        await persistLatest();
      }
    }
  }

  return {
    schedule(value: T) {
      latestValue = value;
      version += 1;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void persistLatest();
      }, options.delayMs);
    },

    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await persistLatest();
      while (saving) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    },

    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      latestValue = undefined;
      version += 1;
      savedVersion = version;
    },
  };
}
