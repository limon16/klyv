"use client";

import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type SmoothHeightProps = {
  children: ReactNode;
  className?: string;
};

export function SmoothHeight({ children, className }: SmoothHeightProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const measure = () => {
      setHeight(content.getBoundingClientRect().height);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);

    return () => observer.disconnect();
  }, []);

  const style = {
    "--smooth-height": height === undefined ? "auto" : `${height}px`,
  } as CSSProperties;

  return (
    <div
      className={["smooth-height", className].filter(Boolean).join(" ")}
      style={style}
    >
      <div className="smooth-height-content" ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
