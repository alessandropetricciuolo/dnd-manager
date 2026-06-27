/** Shared horizontal padding for dense app shells (no max-width cap). */
export const APP_SHELL_X = "px-3 sm:px-4 lg:px-6";

/** Campaign tab content and GM tools under /campaigns. */
export const CAMPAIGN_CONTENT_SHELL = `w-full ${APP_SHELL_X} py-3 sm:py-4 lg:py-5`;

/** Admin pages — slightly tighter vertical rhythm than legacy py-10. */
export const ADMIN_PAGE_SHELL = `min-w-0 w-full ${APP_SHELL_X} py-4 sm:py-5`;

/** Admin sticky nav inner row. */
export const ADMIN_NAV_INNER = `flex w-full flex-wrap items-center gap-2 ${APP_SHELL_X} py-2.5 sm:py-3`;
