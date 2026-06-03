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
  const [offsetX, setOffsetX] = useState(50)   // CSS background-position % (0-100)
  const [offsetY, setOffsetY] = useState(50)
  const [zoom, setZoom]       = useState(1)     // 1 = cover-fit; <1 = zoomed out; >1 = zoomed in
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // Load image dimensions
  useEffect(() => {
    const img = new Image()
    const done = () => {
      if (img.naturalWidth) setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onload = done
    img.src = src
    if (img.complete) done()
  }, [src])

  // Once we know the image size, set an initial zoom that shows the full image
  useEffect(() => {
    if (!natural || !containerRef.current) return
    const cW = containerRef.current.clientWidth
    const cH = containerRef.current.clientHeight
    if (!cW || !cH) return
    const coverScale   = Math.max(cW / natural.w, cH / natural.h)
    const containScale = Math.min(cW / natural.w, cH / natural.h)
    // Start at contain (full image visible), bounded so it's never absurdly small
    setZoom(Math.max(0.25, containScale / coverScale))
  }, [natural])

  function cSize() {
    const el = containerRef.current
    return el ? { w: el.clientWidth || 400, h: el.clientHeight || 100 } : { w: 400, h: 100 }
  }

  // Display dimensions of the image at current zoom (zoom=1 → cover-fit)
  function displayDims() {
    if (!natural) return { w: 0, h: 0, scale: 1 }
    const { w: cW, h: cH } = cSize()
    const scale = Math.max(cW / natural.w, cH / natural.h) * zoom
    return { w: natural.w * scale, h: natural.h * scale, scale }
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault()
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY }
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const { w: cW, h: cH } = cSize()
    const { w: bgW, h: bgH } = displayDims()
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    // Only pan axes where image overflows container
    const overX = bgW - cW
    const overY = bgH - cH
    if (overX > 1) setOffsetX(Math.max(0, Math.min(100, dragRef.current.ox - (dx / overX) * 100)))
    if (overY > 1) setOffsetY(Math.max(0, Math.min(100, dragRef.current.oy - (dy / overY) * 100)))
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

    // Dark background for any empty area (when zoomed out)
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H)

    const img = new Image()
    await new Promise<void>(r => { img.onload = () => r(); img.src = src; if (img.complete) r() })

    const { w: cW, h: cH } = cSize()
    const { w: bgW, h: bgH, scale } = displayDims()

    const overX = bgW - cW
    const overY = bgH - cH

    // CSS background-position % formula: offset = (container - image) * % / 100
    // When image > container this is negative → image shifted left/up
    // srcX = pixels into the image where the visible region starts
    const srcX = overX > 0 ? (overX * offsetX / 100) / scale : 0
    const srcY = overY > 0 ? (overY * offsetY / 100) / scale : 0

    // How much of the image is visible (image coords)
    const srcW = Math.min(cW, bgW) / scale
    const srcH = Math.min(cH, bgH) / scale

    // Destination on canvas — fill if overflowing, center if contained
    const ratio  = OUTPUT_W / cW
    const destW  = srcW * scale * ratio
    const destH  = srcH * scale * ratio
    const destX  = (OUTPUT_W - destW) / 2
    const destY  = (OUTPUT_H - destH) / 2

    ctx.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, destW, destH)
    onApply(canvas.toDataURL('image/jpeg', 0.88))
  }

  const { w: bgW, h: bgH } = displayDims()
  const canDrag = natural && (bgW > (cSize().w + 2) || bgH > (cSize().h + 2))

  return (
    <div className="space-y-3">
      {/* Preview — same 4:1 aspect ratio as the banner */}
      <div
        ref={containerRef}
        style={{
          aspectRatio: '4/1',
          backgroundImage:    `url(${src})`,
          backgroundSize:     natural ? `${bgW}px ${bgH}px` : 'cover',
          backgroundPosition: `${offsetX}% ${offsetY}%`,
          backgroundRepeat:   'no-repeat',
          backgroundColor:    '#1c1917',
        }}
        className={`w-full rounded-xl overflow-hidden select-none ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <p className="text-xs text-center text-stone-400 dark:text-stone-500 -mt-1">
        {canDrag ? 'Drag to reposition' : 'Zoom in to crop'}
      </p>

      {/* Zoom — starts at contain (full image), slide right to zoom in */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">−</span>
        <input
          type="range" min={0.25} max={3} step={0.05} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          className="flex-1 accent-forest-600"
        />
        <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">+</span>
        <span className="text-xs text-stone-400 w-8 text-right shrink-0">{zoom.toFixed(1)}×</span>
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
