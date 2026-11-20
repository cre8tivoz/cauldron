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
    const resize = () => setScale(Math.min(1, element.clientWidth / width));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);
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
