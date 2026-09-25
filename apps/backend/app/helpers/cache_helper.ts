const ONE_YEAR = 31_536_000
const FIVE_MINUTES = 300

/**
 * Cache-Control value for a rates answer. Final answers (a past date the
 * client asked for explicitly) never change and are cached for a year;
 * anything that can still move with the next sync only for five minutes.
 */
export function cacheControl(isFinal: boolean) {
  return `public, max-age=${isFinal ? ONE_YEAR : FIVE_MINUTES}`
}
