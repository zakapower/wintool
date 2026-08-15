'use client'

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

export type FieldSelectOption = { value: string; label: string }

type Props = {
  value: string
  options: FieldSelectOption[]
  onChange: (value: string) => void
  'aria-label'?: string
}

type MenuBox = { top: number; left: number; width: number }

export function FieldSelect({
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState<MenuBox | null>(null)
  const [mounted, setMounted] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setBox(null)
      return
    }

    function place() {
      const trigger = rootRef.current?.querySelector('.select__trigger')
      if (!(trigger instanceof HTMLElement)) return
      const r = trigger.getBoundingClientRect()
      setBox({
        top: Math.round(r.bottom + 2),
        left: Math.round(r.left),
        width: Math.round(r.width),
      })
    }

    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  useEffect(() => {
    if (!open) return

    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onScroll() {
      setOpen(false)
    }

    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const menu =
    open && box && mounted
      ? createPortal(
          <ul
            ref={menuRef}
            id={menuId}
            className="select__menu select__menu--portal"
            role="listbox"
            style={{
              top: box.top,
              left: box.left,
              width: box.width,
            }}
          >
            {options.map((opt) => {
              const active = opt.value === value
              return (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={active ? 'is-active' : undefined}
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )
      : null

  return (
    <div className={`select${open ? ' select--open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="select__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="select__value">{selected?.label}</span>
        <ChevronDown className="select__chev" strokeWidth={2.25} aria-hidden />
      </button>
      {menu}
    </div>
  )
}
