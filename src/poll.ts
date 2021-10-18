/**
 * Polls a function with exponential backoff.
 * Function should return a promise.
 */
export default function poll<T>(
  fn: () => Promise<T>,
  options: { defaultValue?: any; updateInterval: number; maxRetrys?: number },
) {
  let firstRun = true;
  let result = Promise.resolve(options.defaultValue);
  let id: NodeJS.Timeout;
  const call = () => result;
  let canceled = false;
  const cancel = () => {
    canceled = true;
    clearTimeout(id);
  };

  const update = async (depth: number) => {
    if (canceled) return;

    try {
      if (firstRun) {
        // Await the result if we have nothing but the default value
        // Hopefully it doesn't error, otherwise return the default value
        const inFlight = fn();
        result = inFlight.catch(() => options.defaultValue);

        await inFlight;
      } else {
        const value = await fn();
        // Only overwrite result with good data
        result = Promise.resolve(value);
      }
      // Schedule next
      id = setTimeout(() => update(0), options.updateInterval);
      firstRun = false;
    } catch (e) {
      if (depth < (options.maxRetrys ?? 7)) {
        // Retry without changing `result`
        id = setTimeout(
          () => update(depth + 1),
          10 * 2 ** depth + Math.floor(Math.random() * 40),
        );
      } else {
        // Reject and schedule next
        result = Promise.reject(e);
        id = setTimeout(() => update(0), options.updateInterval);
      }
    }
  };

  update(0);

  return { call, cancel };
}
