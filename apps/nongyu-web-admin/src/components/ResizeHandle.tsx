import { useEffect, useRef } from "react";

type ResizeHandleProps = {
  edge: "left" | "right";
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** 拖拽开始/结束，便于父级屏蔽遮罩点击 */
  onDraggingChange?: (dragging: boolean) => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 面板边缘拖拽调宽；双击恢复 defaultValue。
 * 热区加宽并 setPointerCapture，避免被遮罩层抢走事件。
 */
export function ResizeHandle({
  edge,
  value,
  min,
  max,
  defaultValue,
  onChange,
  disabled = false,
  onDraggingChange,
}: ResizeHandleProps) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onDraggingChangeRef = useRef(onDraggingChange);
  onChangeRef.current = onChange;
  onDraggingChangeRef.current = onDraggingChange;

  useEffect(() => {
    if (disabled) return;

    function onMove(event: PointerEvent) {
      if (!draggingRef.current) return;
      const delta = event.clientX - startXRef.current;
      const next = edge === "right" ? startValueRef.current + delta : startValueRef.current - delta;
      onChangeRef.current(clamp(Math.round(next), min, max));
    }

    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      onDraggingChangeRef.current?.(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [disabled, edge, max, min]);

  if (disabled) return null;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label="拖拽调整宽度"
      title="拖拽调整宽度（双击恢复默认）"
      tabIndex={0}
      className={`group absolute top-0 z-[60] h-full w-3 cursor-col-resize touch-none ${
        edge === "right" ? "right-0" : "left-0"
      }`}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        draggingRef.current = true;
        startXRef.current = event.clientX;
        startValueRef.current = value;
        onDraggingChangeRef.current?.(true);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onChange(clamp(defaultValue, min, max));
      }}
    >
      <span className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-transparent transition-colors group-hover:bg-brand/55 group-active:bg-brand" />
    </div>
  );
}
