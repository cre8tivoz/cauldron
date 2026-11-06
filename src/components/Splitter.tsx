import { useCallback, useRef } from 'react';

type Props = {
  onResize: (delta: number) => void;
  label: string;
};

/** Drag to resize the pane beside it. Keyboard arrows do the same job. */
export function Splitter({ onResize, label }: Props) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      lastX.current = event.clientX;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const delta = event.clientX - lastX.current;
      lastX.current = event.clientX;
      if (delta !== 0) onResize(delta);
    },
    [onResize],
  );

  const stop = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <div
      className="splitter"
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') onResize(-16);
        if (event.key === 'ArrowRight') onResize(16);
      }}
    />
  );
}
