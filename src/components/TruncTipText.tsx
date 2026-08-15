'use client'

import { useRef } from 'react'

/** Shows native title tooltip only when the text is visually truncated. */
export function TruncTipText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  function syncTip() {
    const el = ref.current
    if (!el) return
    if (el.scrollWidth > el.clientWidth + 1) el.title = text
    else el.removeAttribute('title')
  }

  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={syncTip}
      onFocus={syncTip}
    >
      {text}
    </span>
  )
}
