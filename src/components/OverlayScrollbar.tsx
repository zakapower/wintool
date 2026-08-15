'use client'

import { useEffect, useRef, useState } from 'react'
import './OverlayScrollbar.css'

const HIDE_DELAY_MS = 900
const MIN_THUMB = 36
const ARROW = 20
const STEP = 72
const SIZE_EPS = 8

export function OverlayScrollbar() {
  const [needed, setNeeded] = useState(false)
  const railRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLButtonElement>(null)
  const hideTimer = useRef(0)
  const raf = useRef(0)
  const resizeRaf = useRef(0)
  const drag = useRef<{ startY: number; startTop: number } | null>(null)
  const hovering = useRef(false)
  const holdTimer = useRef(0)
  const holdInterval = useRef(0)
  const headerH = useRef(0)
  const lastSize = useRef({ view: 0, total: 0 })
  const metrics = useRef({
    view: 0,
    total: 0,
    thumbHeight: MIN_THUMB,
    thumbTop: ARROW,
    track: 0,
  })
  const activeRef = useRef(false)
  const hideScheduleAt = useRef(0)

  useEffect(() => {
    const root = document.documentElement

    function setActiveClass(on: boolean) {
      const rail = railRef.current
      if (!rail) return
      rail.classList.toggle('overlay-scrollbar--active', on)
    }

    function applyThumb(top: number, height: number) {
      const thumb = thumbRef.current
      if (!thumb) return
      if (
        thumb.style.top === `${top}px` &&
        thumb.style.height === `${height}px`
      ) {
        return
      }
      thumb.style.top = `${top}px`
      thumb.style.height = `${height}px`
    }

    function syncHeaderOffset() {
      const header = document.querySelector('.site-header')
      const next =
        header instanceof HTMLElement
          ? Math.round(header.getBoundingClientRect().height)
          : 0
      if (next !== headerH.current) {
        headerH.current = next
        root.style.setProperty('--header-h', `${next}px`)
      }
      return headerH.current
    }

    function layout() {
      const h = syncHeaderOffset()
      const view = root.clientHeight
      const total = root.scrollHeight
      const canScroll = total > view + 1
      metrics.current.view = view
      metrics.current.total = total
      lastSize.current = { view, total }
      setNeeded((prev) => (prev === canScroll ? prev : canScroll))

      if (!canScroll) {
        if (activeRef.current) {
          activeRef.current = false
          setActiveClass(false)
        }
        return
      }

      const railH = railRef.current?.clientHeight || Math.max(0, view - h)
      const track = Math.max(0, railH - ARROW * 2)
      const ratio = view / total
      const rawHeight = Math.max(MIN_THUMB, Math.round(track * ratio))
      const prevHeight = metrics.current.thumbHeight
      const height =
        Math.abs(rawHeight - prevHeight) <= 2 ? prevHeight : rawHeight
      const maxTop = Math.max(0, track - height)

      metrics.current.track = track
      metrics.current.thumbHeight = height

      const top =
        total === view
          ? ARROW
          : ARROW + Math.round((root.scrollTop / (total - view)) * maxTop)
      metrics.current.thumbTop = Math.min(ARROW + maxTop, Math.max(ARROW, top))
      applyThumb(metrics.current.thumbTop, height)
    }

    function syncThumb() {
      const { view, total, thumbHeight, track } = metrics.current
      if (total <= view) return
      const maxTop = Math.max(0, track - thumbHeight)
      const top =
        ARROW + Math.round((root.scrollTop / (total - view)) * maxTop)
      metrics.current.thumbTop = Math.min(ARROW + maxTop, Math.max(ARROW, top))
      applyThumb(metrics.current.thumbTop, thumbHeight)
    }

    function scheduleHide() {
      const now = performance.now()
      if (hideTimer.current && now - hideScheduleAt.current < 120) return
      hideScheduleAt.current = now
      window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => {
        hideTimer.current = 0
        if (!drag.current && !hovering.current) {
          activeRef.current = false
          setActiveClass(false)
        }
      }, HIDE_DELAY_MS)
    }

    function show() {
      if (!activeRef.current) {
        activeRef.current = true
        setActiveClass(true)
      }
      scheduleHide()
    }

    function onScroll() {
      if (raf.current) return
      raf.current = window.requestAnimationFrame(() => {
        raf.current = 0
        if (drag.current) return
        syncThumb()
        show()
      })
    }

    layout()

    function onResize() {
      if (resizeRaf.current) return
      resizeRaf.current = window.requestAnimationFrame(() => {
        resizeRaf.current = 0
        const view = root.clientHeight
        const total = root.scrollHeight
        if (
          lastSize.current.view !== 0 &&
          Math.abs(view - lastSize.current.view) < SIZE_EPS &&
          Math.abs(total - lastSize.current.total) < SIZE_EPS
        ) {
          return
        }
        layout()
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    const ro = new ResizeObserver(onResize)
    ro.observe(document.documentElement)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      window.cancelAnimationFrame(raf.current)
      window.cancelAnimationFrame(resizeRaf.current)
      window.clearTimeout(hideTimer.current)
      window.clearTimeout(holdTimer.current)
      window.clearInterval(holdInterval.current)
    }
  }, [])

  useEffect(() => {
    if (!needed) return
    const root = document.documentElement
    const thumb = thumbRef.current
    if (thumb) {
      thumb.style.top = `${metrics.current.thumbTop}px`
      thumb.style.height = `${metrics.current.thumbHeight}px`
    }

    let moveRaf = 0
    let pendingY = 0

    function applyDrag(clientY: number) {
      if (!drag.current) return
      const { view, total, thumbHeight, track } = metrics.current
      const maxTop = Math.max(0, track - thumbHeight)
      const nextTop = Math.min(
        ARROW + maxTop,
        Math.max(
          ARROW,
          drag.current.startTop + (clientY - drag.current.startY),
        ),
      )
      metrics.current.thumbTop = nextTop
      if (thumbRef.current) thumbRef.current.style.top = `${nextTop}px`
      const maxScroll = total - view
      root.scrollTop =
        maxTop === 0 ? 0 : ((nextTop - ARROW) / maxTop) * maxScroll
    }

    function onMove(e: PointerEvent) {
      if (!drag.current) return
      pendingY = e.clientY
      if (moveRaf) return
      moveRaf = window.requestAnimationFrame(() => {
        moveRaf = 0
        applyDrag(pendingY)
      })
    }

    function onUp() {
      if (!drag.current) return
      drag.current = null
      document.body.classList.remove('is-overlay-dragging')
      window.clearTimeout(hideTimer.current)
      hideTimer.current = window.setTimeout(() => {
        if (!hovering.current) {
          activeRef.current = false
          railRef.current?.classList.remove('overlay-scrollbar--active')
        }
      }, HIDE_DELAY_MS)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.cancelAnimationFrame(moveRaf)
    }
  }, [needed])

  function scrollByStep(delta: number) {
    document.documentElement.scrollBy({ top: delta, behavior: 'auto' })
    if (!activeRef.current) {
      activeRef.current = true
      railRef.current?.classList.add('overlay-scrollbar--active')
    }
  }

  function startHold(delta: number) {
    scrollByStep(delta)
    window.clearTimeout(holdTimer.current)
    window.clearInterval(holdInterval.current)
    holdTimer.current = window.setTimeout(() => {
      holdInterval.current = window.setInterval(() => scrollByStep(delta), 50)
    }, 320)
  }

  function stopHold() {
    window.clearTimeout(holdTimer.current)
    window.clearInterval(holdInterval.current)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      if (!hovering.current && !drag.current) {
        activeRef.current = false
        railRef.current?.classList.remove('overlay-scrollbar--active')
      }
    }, HIDE_DELAY_MS)
  }

  if (!needed) return null

  return (
    <div
      ref={railRef}
      className="overlay-scrollbar"
      aria-hidden="true"
      onPointerEnter={() => {
        hovering.current = true
        activeRef.current = true
        railRef.current?.classList.add('overlay-scrollbar--active')
        window.clearTimeout(hideTimer.current)
      }}
      onPointerLeave={() => {
        hovering.current = false
        if (drag.current) return
        window.clearTimeout(hideTimer.current)
        hideTimer.current = window.setTimeout(() => {
          activeRef.current = false
          railRef.current?.classList.remove('overlay-scrollbar--active')
        }, HIDE_DELAY_MS)
      }}
    >
      <button
        type="button"
        className="overlay-scrollbar__arrow overlay-scrollbar__arrow--up"
        tabIndex={-1}
        onPointerDown={(e) => {
          e.preventDefault()
          startHold(-STEP)
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
      />
      <button
        ref={thumbRef}
        type="button"
        className="overlay-scrollbar__thumb"
        tabIndex={-1}
        onPointerDown={(e) => {
          e.preventDefault()
          drag.current = {
            startY: e.clientY,
            startTop: metrics.current.thumbTop,
          }
          document.body.classList.add('is-overlay-dragging')
          activeRef.current = true
          railRef.current?.classList.add('overlay-scrollbar--active')
          window.clearTimeout(hideTimer.current)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
      />
      <button
        type="button"
        className="overlay-scrollbar__arrow overlay-scrollbar__arrow--down"
        tabIndex={-1}
        onPointerDown={(e) => {
          e.preventDefault()
          startHold(STEP)
        }}
        onPointerUp={stopHold}
        onPointerCancel={stopHold}
      />
    </div>
  )
}
