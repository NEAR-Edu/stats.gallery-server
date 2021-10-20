const hellip = '\u2026';

export function clipString(str: string, max: number, rebound = 0) {
  if (str.length > max) {
    return str.slice(0, max - rebound) + hellip;
  } else {
    return str;
  }
}
