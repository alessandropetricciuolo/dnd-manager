/** True when pre-close rewards were already applied and must not run again. */
export function shouldSkipPreCloseRewards(isPreClosed: boolean | null | undefined): boolean {
  return isPreClosed === true;
}
