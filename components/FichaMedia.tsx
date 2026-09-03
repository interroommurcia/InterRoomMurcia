'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import type { EstadoPiso } from '../lib/pisos'

const ESTADO_LABEL: Record<string, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  alquilada: "Alquilada",
  vendida: "Vendida",
  no_disponible: "No disponible",
}

export default function FichaMedia({
  imageUrl,
  gallery,
  videoUrl,
  titulo,
  estado,
}: {
  imageUrl: string | null
  gallery: string[]
  videoUrl: string | null
  titulo: string
  estado: EstadoPiso
}) {
  const allImages = [
    ...(imageUrl ? [imageUrl] : []),
    ...gallery,
  ]

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  function openLightbox(idx: number) {
    setLightboxIdx(idx)
  }

  return (
    <div className="ficha-hero-wrap">
      {/* Hero — Next.js Image for WebP/AVIF + responsive sizing */}
      <div
        className="ficha-hero"
        onClick={() => imageUrl && openLightbox(0)}
        style={imageUrl ? { cursor: 'zoom-in' } : undefined}
      >
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={titulo}
            fill
            sizes="(max-width: 640px) 100vw, 60vw"
            style={{ objectFit: 'cover' }}
            priority
            quality={75}
          />
        )}
        <span className={`piso-badge estado-${estado}`}>
          {ESTADO_LABEL[estado] || "Disponible"}
        </span>
        {imageUrl && (
          <div className="ficha-hero-zoom-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            Ampliar
          </div>
        )}
      </div>

      {/* Gallery grid — Next.js Image for auto WebP + small sizes */}
      {gallery.length > 0 && (
        <div className="ficha-gallery">
          {gallery.map((url, i) => (
            <div
              key={i}
              className="ficha-gallery-item"
              onClick={() => openLightbox(imageUrl ? i + 1 : i)}
              style={{ cursor: 'zoom-in' }}
            >
              <Image
                src={url}
                alt={`${titulo} — foto ${i + 1}`}
                fill
                sizes="(max-width: 640px) 48vw, 180px"
                style={{ objectFit: 'cover' }}
                loading="lazy"
                quality={60}
              />
            </div>
          ))}
        </div>
      )}

      {/* Video */}
      {videoUrl && (
        <video
          className="ficha-video"
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          poster={imageUrl ?? undefined}
        />
      )}

      {/* Lightbox — limited to 1200px via sizes */}
      {lightboxIdx !== null && allImages.length > 0 && (
        <Lightbox
          images={allImages}
          startIndex={lightboxIdx}
          alt={titulo}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  )
}

/* ── Lightbox ── */

function Lightbox({
  images,
  startIndex,
  alt,
  onClose,
}: {
  images: string[]
  startIndex: number
  alt: string
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIndex)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const lastDist = useRef(0)
  const touchStart = useRef({ x: 0, y: 0, time: 0 })
  const hasMoved = useRef(false)

  const reset = useCallback(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [])

  const go = useCallback((dir: 1 | -1) => {
    reset()
    setIdx(i => {
      const next = i + dir
      if (next < 0) return images.length - 1
      if (next >= images.length) return 0
      return next
    })
  }, [images.length, reset])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, go])

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (scale > 1) reset()
    else setScale(2.5)
  }

  function handleWheel(e: React.WheelEvent) {
    e.stopPropagation()
    const next = Math.min(5, Math.max(1, scale - e.deltaY * 0.003))
    if (next <= 1) reset()
    else setScale(next)
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (scale <= 1) return
    e.preventDefault()
    setDragging(true)
    lastPos.current = { x: e.clientX - translate.x, y: e.clientY - translate.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || scale <= 1) return
    setTranslate({
      x: e.clientX - lastPos.current.x,
      y: e.clientY - lastPos.current.y,
    })
  }

  function handlePointerUp() {
    setDragging(false)
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastDist.current = Math.hypot(dx, dy)
    } else if (e.touches.length === 1 && scale <= 1) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() }
      hasMoved.current = false
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      if (lastDist.current > 0) {
        const next = Math.min(5, Math.max(1, scale * (dist / lastDist.current)))
        if (next <= 1) reset()
        else setScale(next)
      }
      lastDist.current = dist
    } else if (e.touches.length === 1 && scale <= 1) {
      const dx = e.touches[0].clientX - touchStart.current.x
      if (Math.abs(dx) > 10) hasMoved.current = true
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (lastDist.current > 0) {
      lastDist.current = 0
      return
    }
    if (scale > 1 || !hasMoved.current) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current.x
    const elapsed = Date.now() - touchStart.current.time
    if (Math.abs(dx) > 60 && elapsed < 400) {
      go(dx < 0 ? 1 : -1)
    }
  }

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      {/* Close */}
      <button className="lightbox-close" onClick={onClose}>×</button>

      {/* Counter */}
      {images.length > 1 && (
        <div className="lightbox-counter">{idx + 1} / {images.length}</div>
      )}

      {/* Nav arrows */}
      {images.length > 1 && (
        <>
          <button className="lightbox-nav lightbox-prev" onClick={e => { e.stopPropagation(); go(-1) }}>‹</button>
          <button className="lightbox-nav lightbox-next" onClick={e => { e.stopPropagation(); go(1) }}>›</button>
        </>
      )}

      {/* Hint */}
      {scale <= 1 && (
        <div className="lightbox-hint">
          {images.length > 1 ? 'Desliza o doble toque para ampliar' : 'Doble toque para ampliar'}
        </div>
      )}

      {/* Image — Next.js Image capped at 1200px */}
      <div
        className="lightbox-img-wrap"
        onClick={e => e.stopPropagation()}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: dragging ? 'none' : 'transform 0.25s ease',
          cursor: scale > 1 ? 'grab' : 'zoom-in',
        }}
      >
        <Image
          src={images[idx]}
          alt={`${alt} — foto ${idx + 1}`}
          width={1200}
          height={900}
          sizes="(max-width: 640px) 95vw, 1200px"
          style={{ maxWidth: '95vw', maxHeight: '90vh', width: 'auto', height: 'auto', objectFit: 'contain' }}
          quality={80}
          draggable={false}
          priority
        />
      </div>
    </div>
  )
}
