const { sleep } = require('./sleep');

export default async function retry<T>(
  fn: () => Promise<T>,
  options?: {
    delay?: number;
    delayFn?: (i: number, last: number) => number;
    retries?: number;
  },
): Promise<T | undefined> {
  let tries = 0;
  const retries = options?.retries ?? 3;
  let lastDelay = 0;

  do {
    try {
      const value = await fn();
      return value;
    } catch (e) {
      const delay = options?.delayFn
        ? options.delayFn(tries, lastDelay)
        : options?.delay ?? 2000;
      lastDelay = delay;

      tries++;

      if (tries < retries) {
        await sleep(delay);
      } else {
        console.error('Failed after ' + tries + ' retries', e);
        return;
      }
    }
  } while (tries < retries);
}
