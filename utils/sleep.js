module.exports = {
  /** @type {(ms: number) => Promise<void>} */
  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  },
};
