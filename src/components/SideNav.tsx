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

const DEFAULT_SECTION_IDS = NAV_SECTIONS.map((s) => s.id)

function headerOffset() {
  const scope =
    document.querySelector('.generator') ?? document.documentElement
  const styles = getComputedStyle(scope)
  const headerRaw = getComputedStyle(document.documentElement)
    .getPropertyValue('--header-h')
    .trim()
  const headerParsed = Number.parseFloat(headerRaw)
  const header = Number.isFinite(headerParsed) ? headerParsed : 56
  const stickyNav = styles.getPropertyValue('--side-nav-sticky-h').trim()
  const nav = Number.parseFloat(stickyNav)
  const navH = Number.isFinite(nav) ? nav : 0
  return header + (navH > 0 ? navH : 16)
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

let scrollRaf = 0

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

  if (scrollRaf) {
    window.cancelAnimationFrame(scrollRaf)
    scrollRaf = 0
    document.body.classList.remove('is-programmatic-scroll')
  }

  document.body.classList.add('is-programmatic-scroll')

  return new Promise<void>((resolve) => {
    const t0 = performance.now()
    function frame(now: number) {
      const t = Math.min(1, (now - t0) / duration)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      window.scrollTo(0, start + diff * eased)
      if (t < 1) {
        scrollRaf = window.requestAnimationFrame(frame)
      } else {
        scrollRaf = 0
        document.body.classList.remove('is-programmatic-scroll')
        resolve()
      }
    }
    scrollRaf = window.requestAnimationFrame(frame)
  })
}

type Props = {
  sectionIds?: readonly string[]
}

/** Owns scroll-spy state so the heavy generator form does not re-render on scroll. */
export function SideNav({ sectionIds = DEFAULT_SECTION_IDS }: Props) {
  const { lang, t } = useApp()
  const [activeId, navigate] = useActiveSection(sectionIds)
  const navRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())
  const pillRef = useRef<HTMLSpanElement>(null)
  const pillReady = useRef(false)

  const syncPill = useCallback(() => {
    const list = listRef.current
    const pill = pillRef.current
    const link = linkRefs.current.get(activeId)
    if (!list || !pill || !link) return
    const listRect = list.getBoundingClientRect()
    const linkRect = link.getBoundingClientRect()
    pill.style.transform = `translateY(${linkRect.top - listRect.top + list.scrollTop}px)`
    pill.style.height = `${linkRect.height}px`
    if (!pillReady.current) {
      pillReady.current = true
      pill.classList.add('side-nav__pill--ready')
    }
  }, [activeId])

  useLayoutEffect(() => {
    syncPill()
  }, [syncPill, lang])

  useLayoutEffect(() => {
    const navEl = navRef.current
    const generatorEl = document.querySelector('.generator')
    if (!(navEl instanceof HTMLElement) || !(generatorEl instanceof HTMLElement)) {
      return
    }
    const nav = navEl
    const generator = generatorEl

    function syncStickyHeight() {
      const mobile = window.matchMedia('(max-width: 860px)').matches
      if (!mobile) {
        generator.style.removeProperty('--side-nav-sticky-h')
        return
      }
      const height = Math.ceil(nav.getBoundingClientRect().height)
      if (height > 0) {
        generator.style.setProperty('--side-nav-sticky-h', `${height}px`)
      }
    }

    syncStickyHeight()
    const ro = new ResizeObserver(syncStickyHeight)
    ro.observe(nav)
    window.addEventListener('resize', syncStickyHeight, { passive: true })
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncStickyHeight)
      generator.style.removeProperty('--side-nav-sticky-h')
    }
  }, [lang])

  useEffect(() => {
    const link = linkRefs.current.get(activeId)
    const list = listRef.current
    if (!link || !list) return
    const listRect = list.getBoundingClientRect()
    const linkRect = link.getBoundingClientRect()
    const left =
      list.scrollLeft +
      (linkRect.left - listRect.left) -
      (listRect.width - linkRect.width) / 2
    list.scrollTo({
      left: Math.max(0, left),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [activeId])

  useEffect(() => {
    window.addEventListener('resize', syncPill, { passive: true })
    return () => window.removeEventListener('resize', syncPill)
  }, [syncPill])

  return (
    <nav ref={navRef} className="side-nav" aria-label={t('Разделы', 'Sections')}>
      <p className="side-nav__title">{t('Разделы', 'Sections')}</p>
      <div className="side-nav__track">
        <span ref={pillRef} className="side-nav__pill" aria-hidden />
        <ul className="side-nav__list" ref={listRef}>
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
                  navigate(s.id)
                  void smoothScrollTo(el)
                }}
              >
                {lang === 'ru' ? s.ru : s.en}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

export function useActiveSection(ids: readonly string[]) {
  const [activeId, setActiveId] = useState(ids[0] ?? '')
  const lockedUntil = useRef(0)
  const lockTarget = useRef<string | null>(null)
  const activeRef = useRef(ids[0] ?? '')
  const topsRef = useRef<Array<{ id: string; top: number }>>([])
  const raf = useRef(0)
  const trailing = useRef(0)
  const lastCommit = useRef(0)
  const lastDocHeight = useRef(0)

  const syncHash = useCallback((id: string) => {
    if (!id) return
    const next = `#${id}`
    if (window.location.hash === next) return
    history.replaceState(null, '', next)
  }, [])

  const navigate = useCallback(
    (id: string) => {
      lockTarget.current = id
      lockedUntil.current = performance.now() + 850
      activeRef.current = id
      setActiveId(id)
      syncHash(id)
    },
    [syncHash],
  )

  useEffect(() => {
    if (!ids.length) return

    function cacheTops() {
      const y = window.scrollY
      topsRef.current = ids
        .map((id) => {
          const el = document.getElementById(id)
          if (!el) return null
          return { id, top: el.getBoundingClientRect().top + y }
        })
        .filter((x): x is { id: string; top: number } => Boolean(x))
      lastDocHeight.current = document.documentElement.scrollHeight
    }

    function pick(): string {
      const tops = topsRef.current
      if (!tops.length) return ids[0] ?? ''
      const scrollBottom = window.scrollY + window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      if (docHeight - scrollBottom < 96) return tops[tops.length - 1].id
      const line = window.scrollY + headerOffset()
      let next = tops[0].id
      for (const { id, top } of tops) {
        if (top <= line + 1) next = id
      }
      return next
    }

    function commit(next: string) {
      lastCommit.current = performance.now()
      activeRef.current = next
      setActiveId(next)
      syncHash(next)
    }

    function update(force = false) {
      if (lockTarget.current && performance.now() < lockedUntil.current) return
      lockTarget.current = null
      const next = pick()
      if (next === activeRef.current) return
      const now = performance.now()
      if (!force && now - lastCommit.current < 100) {
        window.clearTimeout(trailing.current)
        trailing.current = window.setTimeout(() => update(true), 100)
        return
      }
      window.clearTimeout(trailing.current)
      commit(next)
    }

    function onScroll() {
      if (raf.current) return
      raf.current = window.requestAnimationFrame(() => {
        raf.current = 0
        const height = document.documentElement.scrollHeight
        if (height !== lastDocHeight.current) cacheTops()
        update()
      })
    }

    function onResize() {
      cacheTops()
      update(true)
    }

    cacheTops()
    update(true)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.cancelAnimationFrame(raf.current)
      window.clearTimeout(trailing.current)
      if (scrollRaf) {
        window.cancelAnimationFrame(scrollRaf)
        scrollRaf = 0
        document.body.classList.remove('is-programmatic-scroll')
      }
    }
  }, [ids, syncHash])

  return [activeId, navigate] as const
}
