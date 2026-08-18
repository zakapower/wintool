'use client'

import Link from 'next/link'
import { BookOpen, ShieldCheck, Wrench } from 'lucide-react'
import { SiGithub } from '@icons-pack/react-simple-icons'
import { useApp } from '@/context/AppContext'
import './About.css'

const GITHUB_URL = 'https://github.com/zakapower'

export function AboutView() {
  const { t } = useApp()

  return (
    <article className="about">
      <header className="about__head">
        <p className="about__kicker">WinTools</p>
        <h1>{t('О проекте', 'About')}</h1>
        <p className="about__lead">
          {t(
            'Зачем нужен WinTools и чем он не является.',
            'What WinTools is for and what it is not.',
          )}
        </p>
      </header>

      <section className="about-card">
        <span className="about-card__icon" aria-hidden>
          <Wrench strokeWidth={2} />
        </span>
        <div className="about-card__body">
          <h2>{t('Что это', 'What this is')}</h2>
          <p>
            {t(
              'WinTools - минималистичный генератор autounattend.xml для Windows 11. Ответы мастера собираются в спокойном UI: скачиваете один файл и ставите систему с флешки без кабинетов и облака. Как записать флешку - во вкладке',
              'WinTools is a minimal autounattend.xml generator for Windows 11. Setup answers are collected in a calm UI: download one file and install from a USB stick, with no accounts or cloud. How to write the USB is in the',
            )}{' '}
            <Link href="/guide">{t('Инструкция', 'Guide')}</Link>.
          </p>
          <p>
            {t(
              'Это не официальный инструмент Microsoft, а генератор ответа для личной переустановки.',
              'This is not an official Microsoft tool, just an answer-file generator for a personal reinstall.',
            )}
          </p>
        </div>
      </section>

      <section className="about-card">
        <span className="about-card__icon" aria-hidden>
          <ShieldCheck strokeWidth={2} />
        </span>
        <div className="about-card__body">
          <h2>{t('Приватность', 'Privacy')}</h2>
          <p>
            {t(
              'Нет регистрации и облачного аккаунта. Язык, тема и черновик настроек живут локально в браузере. Сервер только собирает XML по запросу и ничего не сохраняет: ни ключей, ни паролей, ни имени ПК. Данные не продаются и не уходят в аналитику.',
              'No sign-up and no cloud account. Language, theme, and the draft config stay locally in the browser. The server only builds XML on request and stores nothing: no keys, passwords, or PC names. Nothing is sold or shipped to analytics.',
            )}
          </p>
        </div>
      </section>

      <section className="about-card">
        <span className="about-card__icon" aria-hidden>
          <SiGithub color="currentColor" size={20} title="" aria-hidden />
        </span>
        <div className="about-card__body">
          <h2>{t('Исходный код', 'Source')}</h2>
          <p>
            {t(
              'WinTools - свободная программа с открытым исходным кодом. Репозиторий, ошибки и предложения на GitHub.',
              'WinTools is free and open source. The repository, issues, and ideas are on GitHub.',
            )}
          </p>
        </div>
      </section>

      <div className="about-cta-row">
        <a
          className="about-cta"
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <SiGithub color="currentColor" size={20} title="" aria-hidden />
          <span>
            <strong>GitHub</strong>
            <em>{t('Код, ошибки и идеи', 'Code, issues, and ideas')}</em>
          </span>
        </a>
        <Link href="/guide" className="about-cta">
          <BookOpen strokeWidth={2} aria-hidden />
          <span>
            <strong>{t('Инструкция', 'Guide')}</strong>
            <em>
              {t('Как записать флешку и поставить систему', 'How to write the USB and install')}
            </em>
          </span>
        </Link>
      </div>
    </article>
  )
}
