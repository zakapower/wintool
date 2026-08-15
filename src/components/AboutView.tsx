'use client'

import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import './About.css'

const GITHUB_URL = 'https://github.com/zakapower'

export function AboutView() {
  const { t } = useApp()

  return (
    <article className="about">
      <header className="about__head">
        <h1>{t('О проекте', 'About')}</h1>
        <p className="about__lead">
          {t(
            'Зачем нужен WinTools и как им пользоваться.',
            'What WinTools is for and how to use it.',
          )}
        </p>
      </header>

      <div className="about__prose">
        <section>
          <h2>{t('Что это', 'What this is')}</h2>
          <p>
            {t(
              'WinTools генерирует файл autounattend.xml для автоустановки Windows 10/11. Вы собираете ответы мастера установки в удобном UI и скачиваете готовый XML на флешку рядом с образом.',
              'WinTools generates an autounattend.xml answer file for Windows 10/11 setup. You configure options in a simple UI, download the XML, and place it next to the install image on a USB stick.',
            )}
          </p>
        </section>

        <section>
          <h2>{t('Что внутри', 'What’s inside')}</h2>
          <ul>
            <li>
              {t(
                'Язык, раскладки, регион и часовой пояс',
                'Language, keyboards, region, and time zone',
              )}
            </li>
            <li>
              {t(
                'Редакция и ключ (или generic / без ключа)',
                'Edition and product key (generic or none)',
              )}
            </li>
            <li>
              {t(
                'Разметка диска: интерактивно или wipe Disk 0',
                'Disk layout: interactive or wipe Disk 0',
              )}
            </li>
            <li>
              {t(
                'Имя ПК, локальный пользователь (автологин всегда)',
                'PC name, local user (auto logon always on)',
              )}
            </li>
            <li>
              {t(
                'Белый список системных AppX и установка программ через winget',
                'System AppX whitelist and winget app installs',
              )}
            </li>
          </ul>
        </section>

        <section>
          <h2>{t('Как пользоваться', 'How to use')}</h2>
          <p>
            {t(
              'Кратко: пройдите блоки на главной, проверьте диск и скачайте autounattend.xml. Подробный разбор (что нужно для переустановки, как подготовить флешку и что делать при ошибках) во вкладке',
              'In short: go through the home page blocks, check the disk settings, and download autounattend.xml. A full walkthrough (what you need to reinstall, how to prepare the USB, and troubleshooting) is in the',
            )}{' '}
            <Link href="/guide">{t('Инструкция', 'Guide')}</Link>.
          </p>
        </section>

        <section>
          <h2>{t('Приватность', 'Privacy')}</h2>
          <p>
            {t(
              'Настройки живут в браузере до скачивания. Сервер только собирает XML по запросу и ничего не сохраняет: ни ключей, ни паролей, ни имени ПК.',
              'Settings stay in the browser until download. The server only builds XML on request and stores nothing: no keys, passwords, or PC names.',
            )}
          </p>
        </section>

        <section>
          <h2>{t('Открытость', 'Openness')}</h2>
          <p>
            {t(
              'Проект в семье соседних утилит. Профиль автора на',
              'Part of the same family of small tools. Author profile on',
            )}{' '}
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  )
}
