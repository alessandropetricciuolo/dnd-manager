type ProjectionScreen = {
  availHeight: number;
  availLeft: number;
  availTop: number;
  availWidth: number;
};

type ScreenDetails = {
  currentScreen: ProjectionScreen;
  screens: readonly ProjectionScreen[];
};

type WindowWithScreenDetails = Window & {
  getScreenDetails?: () => Promise<ScreenDetails>;
};

type ProjectionWindowOptions = {
  fallbackWidth?: number;
  fallbackHeight?: number;
  fitCurrentScreen?: boolean;
};

function isSameScreen(a: ProjectionScreen, b: ProjectionScreen): boolean {
  return a.availLeft === b.availLeft && a.availTop === b.availTop &&
    a.availWidth === b.availWidth && a.availHeight === b.availHeight;
}

/** Opens a reusable projection popup on the display that does not contain the GM window. */
export async function openProjectionWindow(
  url: string,
  windowName: string,
  options: ProjectionWindowOptions = {},
): Promise<Window | null> {
  const managedWindow = window as WindowWithScreenDetails;
  let targetScreen: ProjectionScreen | undefined;

  if (managedWindow.getScreenDetails) {
    try {
      const details = await managedWindow.getScreenDetails();
      targetScreen = details.screens.find(
        (screen) => screen !== details.currentScreen && !isSameScreen(screen, details.currentScreen),
      );
    } catch {
      // Permission denied or unavailable: retain the normal popup behavior.
    }
  }

  const currentScreen = window.screen as Screen & { availLeft?: number; availTop?: number };
  const width = targetScreen?.availWidth ?? (options.fitCurrentScreen
    ? Math.max(currentScreen.availWidth || window.innerWidth, 1024)
    : options.fallbackWidth ?? 1280);
  const height = targetScreen?.availHeight ?? (options.fitCurrentScreen
    ? Math.max(currentScreen.availHeight || window.innerHeight, 720)
    : options.fallbackHeight ?? 720);
  const position = targetScreen
    ? `left=${targetScreen.availLeft},top=${targetScreen.availTop},`
    : "";
  const features = `${position}width=${width},height=${height},popup=yes,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`;
  const popup = window.open(url, windowName, features);

  if (popup && targetScreen) {
    try {
      // Window features can be ignored when a named projection window is reused.
      popup.moveTo(targetScreen.availLeft, targetScreen.availTop);
      popup.resizeTo(targetScreen.availWidth, targetScreen.availHeight);
      popup.focus();
    } catch {
      // Chrome may still restrict moving or resizing in some window configurations.
    }
  }

  return popup;
}
