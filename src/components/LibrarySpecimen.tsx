import { useLayoutEffect, useRef, useState } from 'react';

/** Scale the viewport, not the layout. A section's media queries still see its intended width. */
export function LibrarySpecimen({
  html,
  title,
  width = 768,
  height = 420,
  passive = false,
}: {
  html: string;
  title: string;
  width?: number;
  height?: number;
  passive?: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    // Fit width *and* height. Fitting width alone let the stage clip the bottom
    // of a 520px-tall frame whenever the canvas was shorter, cutting a card in
    // half and leaving dead space below it.
    const resize = () => {
      const available = element.parentElement?.clientHeight ?? 0;
      const byWidth = element.clientWidth / width;
      const byHeight = available > 0 ? available / height : 1;
      setScale(Math.max(0.1, Math.min(1, byWidth, byHeight)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    if (element.parentElement) observer.observe(element.parentElement);
    return () => observer.disconnect();
  }, [width, height]);
  return (
    <div
      className="library-specimen"
      ref={stage}
      inert={passive}
      style={{ height: height * scale }}
    >
      <iframe
        title={title}
        srcDoc={html}
        sandbox=""
        loading={passive ? 'lazy' : 'eager'}
        tabIndex={passive ? -1 : undefined}
        style={{ width, height, transform: `scale(${scale})` }}
      />
    </div>
  );
}
