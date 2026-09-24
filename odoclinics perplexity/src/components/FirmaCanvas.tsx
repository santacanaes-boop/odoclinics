"use client";

import { useRef, useState } from "react";

// Canvas de firma táctil real (sección 4.3.6), pensado para firmar in situ
// en la tablet delante del paciente.
export default function FirmaCanvas({
  onGuardar,
}: {
  onGuardar: (firma: Blob) => Promise<void>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [vacio, setVacio] = useState(true);
  const [guardando, setGuardando] = useState(false);

  function coords(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    dibujando.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = coords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = coords(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#33103B";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    setVacio(false);
  }

  function handlePointerUp() {
    dibujando.current = false;
  }

  function limpiar() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setVacio(true);
  }

  function guardar() {
    const canvas = canvasRef.current!;
    setGuardando(true);
    canvas.toBlob(async (blob) => {
      if (blob) {
        await onGuardar(blob);
        limpiar();
      }
      setGuardando(false);
    }, "image/png");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={480}
        height={180}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="touch-none w-full max-w-md rounded-lg border-2 border-dashed border-purple-300 bg-white"
      />
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={limpiar}
          className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
        >
          Borrar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={vacio || guardando}
          className="rounded-lg bg-purple-700 text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar firma"}
        </button>
      </div>
    </div>
  );
}
