const hellip = '\u2026';

module.exports = function clipString(str, max, rebound = 0) {
  if (str.length > max) {
    return str.slice(0, max - rebound) + hellip;
  } else {
    return str;
  }
}
