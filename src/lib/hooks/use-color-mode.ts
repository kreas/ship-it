"use client";

import { useEffect, useState } from "react";

type ColorMode = "light" | "dark";

/**
 * Hook to detect and track the current color mode (light/dark).
 * Watches for changes to the `dark` class on the document element.
 */
export function useColorMode(): ColorMode {
  const [colorMode, setColorMode] = useState<ColorMode>("light");

  useEffect(() => {
    const updateColorMode = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setColorMode(isDark ? "dark" : "light");
    };

    updateColorMode();

    const observer = new MutationObserver(updateColorMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return colorMode;
}
