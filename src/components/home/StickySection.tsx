import { useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * One layer of the landing-page "stack": the section scrolls normally until its bottom reaches
 * the bottom of the screen, then stays put while the next section rises up and covers it.
 * Tall sections (common on phones) are fully readable before they stick.
 */
export default function StickySection({
  children,
  layer,
  className = '',
}: {
  children: ReactNode;
  /** Stacking order: later sections need a higher layer so they slide over earlier ones */
  layer: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Stick when the bottom of the section meets the bottom of the screen
    const update = () => {
      el.style.top = `${Math.min(0, window.innerHeight - el.offsetHeight)}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div ref={ref} style={{ zIndex: layer }} className={`sticky top-0 ${className}`}>
      {children}
    </div>
  );
}
