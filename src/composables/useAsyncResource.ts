import { onBeforeUnmount, type Ref, ref } from "vue";
import { ApiError } from "@/api/client";

export interface AsyncResource<T> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<ApiError | null>;
  load: () => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Wraps a typed-client call with loading/error state and cancels any in-flight
 * request when the component unmounts or load is re-triggered. The fetcher
 * receives an AbortSignal it should forward to the client.
 */
export function useAsyncResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
): AsyncResource<T> {
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(false);
  const error = ref<ApiError | null>(null);
  let controller: AbortController | null = null;

  async function load() {
    controller?.abort();
    const local = new AbortController();
    controller = local;
    loading.value = true;
    error.value = null;
    try {
      const result = await fetcher(local.signal);
      if (local.signal.aborted) return;
      data.value = result;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof ApiError) {
        error.value = err;
      } else {
        error.value = new ApiError(0, "Unknown error");
      }
    } finally {
      if (controller === local) loading.value = false;
    }
  }

  onBeforeUnmount(() => controller?.abort());

  return { data, loading, error, load, reload: load };
}
