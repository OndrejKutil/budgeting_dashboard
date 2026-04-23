import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Detects if the app is running in PWA standalone mode
 * (i.e. added to home screen on iOS or installed as PWA on Android/desktop).
 */
export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia('(display-mode: standalone)');
    const check = () => {
      setIsStandalone(
        mql.matches || (navigator as any).standalone === true
      );
    };
    check();
    mql.addEventListener('change', check);
    return () => mql.removeEventListener('change', check);
  }, []);

  return isStandalone;
}
