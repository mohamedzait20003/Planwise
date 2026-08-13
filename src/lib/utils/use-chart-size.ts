"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measures the element the chart draws into.
 *
 * An SVG can scale itself with a viewBox, but a chart that does so scales its
 * type and stroke widths along with the data — 11px axis labels become 7px on a
 * narrow card. Measuring instead lets the chart re-lay out at the new width
 * with its text left alone, which is the difference between a resized picture
 * and a responsive chart.
 *
 * Width only: the height is set by the caller's class, so observing it would
 * feed the chart back its own layout.
 */
export function useChartSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      // Rounded before comparing: sub-pixel content boxes otherwise emit a
      // change on every scrollbar-induced reflow and re-render the chart.
      const next = Math.round(entry.contentRect.width);
      setWidth((current) => (current === next ? current : next));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
