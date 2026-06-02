'use client'

import { useRef, useEffect, useState } from 'react'

interface Props {
  src: string
  onApply: (croppedUrl: string) => void
  onCancel: () => void
}

const OUTPUT_W = 1200
const OUTPUT_H = 300

export default function ImageEditor({ src, onApply, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offsetX, setOffsetX] = useState(50) // 0-100 %
  const [offsetY, setOffsetY] = useState(50)
  const [zoom, setZoom] = useState(1)        // multiplier on top of cover
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    const img = new Image()
    const load = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    img.onload = load
    img.src = src
    if (img.complete) load() // data URLs can load synchronously before onload is wired
  }, [src])

  function cSize() {
    const el = containerRef.current
    return el ? { w: el.clientWidth, h: el.clientHeight } : { w: 400, h: 112 }
  }

  function bgDims() {
    if (!natural) return { w: 400, h: 112, cover: 1 }
    const { w: cW, h: cH } = cSize()
    const cover = Math.max(cW / natural.w, cH / natural.h) * zoom
    return { w: Math.round(natural.w * cover), h: Math.round(natural.h * cover), cover }
  }

  function pxOffset() {
    const { w: cW, h: cH } = cSize()
    const { w: bgW, h: bgH } = bgDims()
    return {
      x: Math.round((offsetX / 100) * Math.max(0, bgW - cW)),
      y: Math.round((offsetY / 100) * Math.max(0, bgH - cH)),
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault()
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY }
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const { w: cW, h: cH } = cSize()
    const { w: bgW, h: bgH } = bgDims()
    const maxX = Math.max(1, bgW - cW)
    const maxY = Math.max(1, bgH - cH)
    // drag right → image moves right → less offset (seeing more left side)
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    setOffsetX(Math.max(0, Math.min(100, dragRef.current.ox - (dx / maxX) * 100)))
    setOffsetY(Math.max(0, Math.min(100, dragRef.current.oy - (dy / maxY) * 100)))
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current = null
    containerRef.current?.releasePointerCapture(e.pointerId)
  }

  async function applyCrop() {
    if (!natural) return
    const canvas = document.createElement('canvas')
    canvas.width  = OUTPUT_W
    canvas.height = OUTPUT_H
    const ctx = canvas.getContext('2d')!

    const img = new Image()
    img.src = src
    await new Promise<void>(r => { img.onload = () => r(); img.src = src; if (img.complete) r() })

    const { w: cW, h: cH } = cSize()
    const { cover } = bgDims()
    const bgW = natural.w * cover
    const bgH = natural.h * cover

    const offX = (offsetX / 100) * Math.max(0, bgW - cW)
    const offY = (offsetY / 100) * Math.max(0, bgH - cH)

    // Map back to source image pixels
    const srcX = offX / cover
    const srcY = offY / cover
    const srcW = cW  / cover
    const srcH = cH  / cover

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUTPUT_W, OUTPUT_H)
    onApply(canvas.toDataURL('image/jpeg', 0.88))
  }

  const { x: ox, y: oy } = pxOffset()
  const { w: bgW, h: bgH } = bgDims()

  return (
    <div className="space-y-3">
      {/* Live preview — drag to pan */}
      <div
        ref={containerRef}
        className="w-full h-28 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none bg-stone-900"
        style={{
          backgroundImage:    `url(${src})`,
          backgroundSize:     `${bgW}px ${bgH}px`,
          backgroundPosition: `-${ox}px -${oy}px`,
          backgroundRepeat:   'no-repeat',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <p className="text-xs text-center text-stone-400 dark:text-stone-500 -mt-1">Drag to reposition</p>

      {/* Zoom */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">Zoom</span>
        <input
          type="range" min={1} max={3} step={0.05} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="flex-1 accent-forest-600"
        />
        <span className="text-xs text-stone-500 dark:text-stone-400 w-8 text-right shrink-0">
          {zoom.toFixed(1)}×
        </span>
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-secondary text-xs">Cancel</button>
        <button onClick={applyCrop} disabled={!natural} className="btn-primary text-xs disabled:opacity-40">
          Use this crop
        </button>
      </div>
    </div>
  )
}
