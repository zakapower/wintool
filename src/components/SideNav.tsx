'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useApp } from '@/context/AppContext'
import { NAV_SECTIONS } from '@/lib/types'
import './SideNav.css'

type Props = {
  activeId: string
  onNavigate?: (id: string) => void
}

function headerOffset() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--header-h')
    .trim()
  const parsed = Number.parseFloat(raw)
  return (Number.isFinite(parsed) ? parsed : 56) + 16
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function smoothScrollTo(el: HTMLElement, duration = 720) {
  const start = window.scrollY
  const target = Math.max(
    0,
    el.getBoundingClientRect().top + window.scrollY - headerOffset(),
  )
  const diff = target - start
  if (Math.abs(diff) < 1) return Promise.resolve()

  if (prefersReducedMotion() || duration <= 0) {
    window.scrollTo(0, target)
    return Promise.resolve()
  }

  document.body.classList.add('is-programmatic-scroll')

  return new Promise<void>((resolve) => {
    const t0 = performance.now()
    function frame(now: number) {
      const t = Math.min(1, (now - t0) / duration)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      window.scrollTo(0, start + diff * eased)
      if (t < 1) {
        requestAnimationFrame(frame)
      } else {
        document.body.classList.remove('is-programmatic-scroll')
        resolve()
      }
    }
    requestAnimationFrame(frame)
  })
}

export function SideNav({ activeId, onNavigate }: Props) {
  const { lang, t } = useApp()
  const listRef = useRef<HTMLUListElement>(null)
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())
  const [pill, setPill] = useState({ top: 0, height: 0, ready: false })

  const syncPill = useCallback(() => {
    const list = listRef.current
    const link = linkRefs.current.get(activeId)
    if (!list || !link) return
    const listRect = list.getBoundingClientRect()
    const linkRect = link.getBoundingClientRect()
    setPill({
      top: linkRect.top - listRect.top + list.scrollTop,
      height: linkRect.height,
      ready: true,
    })
  }, [activeId])

  useLayoutEffect(() => {
    syncPill()
  }, [syncPill, lang])

  useEffect(() => {
    window.addEventListener('resize', syncPill)
    return () => window.removeEventListener('resize', syncPill)
  }, [syncPill])

  return (
    <nav className="side-nav" aria-label={t('Разделы', 'Sections')}>
      <p className="side-nav__title">{t('Разделы', 'Sections')}</p>
      <ul className="side-nav__list" ref={listRef}>
        <span
          className={
            pill.ready
              ? 'side-nav__pill side-nav__pill--ready'
              : 'side-nav__pill'
          }
          style={{
            transform: `translateY(${pill.top}px)`,
            height: pill.height,
          }}
          aria-hidden
        />
        {NAV_SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              ref={(node) => {
                if (node) linkRefs.current.set(s.id, node)
                else linkRefs.current.delete(s.id)
              }}
              href={`#${s.id}`}
              className={
                activeId === s.id
                  ? 'side-nav__link side-nav__link--active'
                  : 'side-nav__link'
              }
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(s.id)
                if (!el) return
                onNavigate?.(s.id)
                void smoothScrollTo(el).then(() => {
                  history.replaceState(null, '', `#${s.id}`)
                })
              }}
            >
              {lang === 'ru' ? s.ru : s.en}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function useActiveSection(ids: readonly string[]) {
  const [activeId, setActiveId] = useState(ids[0] ?? '')
  const lockedUntil = useRef(0)
  const lockTarget = useRef<string | null>(null)
  const activeRef = useRef(ids[0] ?? '')
  const raf = useRef(0)
  const elementsRef = useRef<Array<{ id: string; el: HTMLElement }>>([])

  const navigate = useCallback((id: string) => {
    lockTarget.current = id
    lockedUntil.current = performance.now() + 850
    activeRef.current = id
    setActiveId(id)
  }, [])

  useEffect(() => {
    if (!ids.length) return

    function cacheElements() {
      elementsRef.current = ids
        .map((id) => {
          const el = document.getElementById(id)
          return el ? { id, el } : null
        })
        .filter((x): x is { id: string; el: HTMLElement } => Boolean(x))
    }

    function update() {
      if (lockTarget.current && performance.now() < lockedUntil.current) {
        return
      }
      lockTarget.current = null

      const elements = elementsRef.current
      if (!elements.length) return

      const scrollBottom = window.scrollY + window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      let next = elements[0].id
      if (docHeight - scrollBottom < 96) {
        next = elements[elements.length - 1].id
      } else {
        const offset = headerOffset()
        for (const { id, el } of elements) {
          if (el.getBoundingClientRect().top - offset <= 1) next = id
        }
      }

      if (next !== activeRef.current) {
        activeRef.current = next
        setActiveId(next)
      }
    }

    function onScroll() {
      if (raf.current) return
      raf.current = window.requestAnimationFrame(() => {
        raf.current = 0
        update()
      })
    }

    function onResize() {
      cacheElements()
      update()
    }

    cacheElements()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(raf.current)
    }
  }, [ids])

  return [activeId, navigate] as const
}
