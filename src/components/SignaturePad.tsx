import { useEffect, useRef, useState } from 'react'
import { Eraser, PenTool } from 'lucide-react'

interface SignaturePadProps {
  value: string
  onChange: (dataUrl: string) => void
}

export function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const hasStrokeRef = useRef(Boolean(value))
  const [isEmpty, setIsEmpty] = useState(!value)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(300, Math.floor(rect.width * ratio))
    canvas.height = Math.floor(170 * ratio)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(ratio, ratio)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, 170)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, 170)
        hasStrokeRef.current = true
        setIsEmpty(false)
      }
      img.src = value
    }
    // Initialize once on mount so drawing strokes are preserved cleanly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    canvas.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    const { x, y } = getPoint(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 0.1, y + 0.1)
    ctx.stroke()
    hasStrokeRef.current = true
    setIsEmpty(false)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const { x, y } = getPoint(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const canvas = canvasRef.current
    if (!canvas) return

    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId)
    }
    if (hasStrokeRef.current) {
      onChange(canvas.toDataURL('image/png'))
    }
  }

  function handleClear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, 170)
    hasStrokeRef.current = false
    setIsEmpty(true)
    onChange('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <PenTool className="h-4 w-4 text-slate-600" />
          Assinatura do aluno ou responsável legal *
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Eraser className="h-3.5 w-3.5" />
          Limpar
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="h-[170px] w-full cursor-crosshair touch-none"
        />
        {isEmpty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-slate-400">
              Assine aqui com o dedo ou mouse
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
