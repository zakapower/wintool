'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { Menu, Moon, Sun, Wrench, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import './Header.css'

const GITHUB_URL = 'https://github.com/zakapower'

export function Header() {
  const pathname = usePathname()
  const { lang, theme, themeReady, toggleLang, toggleTheme, t } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()

  function navClass(href: string, end = false) {
    const active = end
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)
    return active ? 'active' : undefined
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.documentElement.classList.add('menu-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('menu-open')
    }
  }, [menuOpen])

  const toolControls = (
    <>
      <a
        className="ctrl"
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
      >
        <SiGithub
          className="ctrl__icon"
          color="currentColor"
          size={18}
          title=""
          aria-hidden
        />
      </a>
      <button
        type="button"
        className={`ctrl${lang === 'en' ? ' ctrl--lang-en' : ''}`}
        onClick={toggleLang}
        aria-label={t('Переключить на English', 'Switch to Russian')}
      >
        <span className="ctrl__stack" aria-hidden>
          <span className="ctrl__face ctrl__face--en">EN</span>
          <span className="ctrl__face ctrl__face--ru">RU</span>
        </span>
      </button>
      <button
        type="button"
        className={`ctrl${theme === 'dark' ? ' ctrl--theme-dark' : ''}${themeReady ? '' : ' ctrl--theme-boot'}`}
        onClick={toggleTheme}
        aria-label={
          theme === 'light' ? t('Тёмная тема', 'Dark theme') : t('Светлая тема', 'Light theme')
        }
      >
        <span className="ctrl__stack" aria-hidden>
          <Moon className="ctrl__face ctrl__face--moon" strokeWidth={2} />
          <Sun className="ctrl__face ctrl__face--sun" strokeWidth={2} />
        </span>
      </button>
    </>
  )

  return (
    <header className={`site-header${menuOpen ? ' site-header--menu-open' : ''}`}>
      <div className="site-header__inner">
        <div className="site-header__bar">
          <Link href="/" className="brand" aria-label="WinTools">
            <Wrench className="brand__mark" strokeWidth={2.25} aria-hidden />
            <span className="brand__name">WinTools</span>
          </Link>

          <nav className="site-nav" aria-label={t('Меню', 'Menu')}>
            <Link href="/" className={navClass('/', true)}>
              {t('Генератор', 'Generator')}
            </Link>
            <Link href="/guide" className={navClass('/guide')}>
              {t('Инструкция', 'Guide')}
            </Link>
            <Link href="/about" className={navClass('/about')}>
              {t('О проекте', 'About')}
            </Link>
          </nav>

          <div className="site-controls">
            <button
              type="button"
              className={`ctrl site-controls__burger${menuOpen ? ' ctrl--menu-open' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? t('Закрыть меню', 'Close menu') : t('Открыть меню', 'Open menu')}
            >
              <span className="ctrl__stack" aria-hidden>
                <Menu className="ctrl__face ctrl__face--menu" strokeWidth={2} />
                <X className="ctrl__face ctrl__face--close" strokeWidth={2} />
              </span>
            </button>
            <div className="site-controls__tools">{toolControls}</div>
          </div>

          {menuOpen && (
            <div className="site-menu" id={menuId} aria-label={t('Действия', 'Actions')}>
              <div className="site-menu__actions">
                <button type="button" className="site-menu__action" onClick={toggleLang}>
                  <span className="site-menu__action-badge" aria-hidden>
                    {lang === 'ru' ? 'EN' : 'RU'}
                  </span>
                  <span>{lang === 'ru' ? 'English' : 'Русский'}</span>
                </button>
                <button type="button" className="site-menu__action" onClick={toggleTheme}>
                  {theme === 'light' ? (
                    <Moon className="site-menu__action-icon" strokeWidth={2} aria-hidden />
                  ) : (
                    <Sun className="site-menu__action-icon" strokeWidth={2} aria-hidden />
                  )}
                  <span>
                    {theme === 'light'
                      ? t('Тёмная тема', 'Dark theme')
                      : t('Светлая тема', 'Light theme')}
                  </span>
                </button>
                <a
                  className="site-menu__action"
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SiGithub
                    className="site-menu__action-icon"
                    color="currentColor"
                    size={18}
                    title=""
                    aria-hidden
                  />
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {menuOpen && (
        <button
          type="button"
          className="site-menu__backdrop"
          aria-label={t('Закрыть меню', 'Close menu')}
          onClick={() => setMenuOpen(false)}
        />
      )}
    </header>
  )
}
