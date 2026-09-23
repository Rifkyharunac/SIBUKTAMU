"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignaturePad({ onChange }: { onChange: (value: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const onChangeRef = useRef(onChange);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const previous = hasInk.current ? canvas.toDataURL() : null;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.25;
    context.strokeStyle = "#0f172a";
    if (previous) {
      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, rect.width, rect.height);
        onChangeRef.current(canvas.toDataURL("image/png", 0.8));
      };
      image.src = previous;
    }
  }, []);

  useEffect(() => {
    prepareCanvas();
    window.addEventListener("resize", prepareCanvas);
    return () => window.removeEventListener("resize", prepareCanvas);
  }, [prepareCanvas]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    const current = point(event);
    if (!context) return;

    // Beri tinta sejak sentuhan pertama agar awal tanda tangan tidak terpotong.
    context.beginPath();
    context.arc(current.x, current.y, context.lineWidth / 2, 0, Math.PI * 2);
    context.fillStyle = context.strokeStyle;
    context.fill();
    context.beginPath();
    context.moveTo(current.x, current.y);
    hasInk.current = true;
    setHasSignature(true);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    event.preventDefault();
    const context = event.currentTarget.getContext("2d");
    const current = point(event);
    context?.lineTo(current.x, current.y);
    context?.stroke();
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const canvas = canvasRef.current;
    if (canvas && hasInk.current) onChangeRef.current(canvas.toDataURL("image/png", 0.8));
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.restore();
    }
    drawing.current = false;
    hasInk.current = false;
    setHasSignature(false);
    onChangeRef.current(null);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white focus-within:border-[#0369a1] focus-within:ring-4 focus-within:ring-sky-100">
        <canvas
          ref={canvasRef}
          className="h-44 w-full cursor-crosshair touch-none"
          aria-label="Area tanda tangan digital"
          tabIndex={0}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={finish}
          onContextMenu={(event) => event.preventDefault()}
        />
        {!hasSignature && <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-slate-400">Tanda tangan di dalam kotak ini</p>}
        <div className="pointer-events-none absolute bottom-4 left-10 right-10 border-b border-slate-300" />
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={clear}><Eraser />Hapus tanda tangan</Button>
        <Button type="button" variant="ghost" size="sm" onClick={clear}><RotateCcw />Ulangi</Button>
      </div>
    </div>
  );
}
