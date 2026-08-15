'use client'

import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import './About.css'

export function GuideView() {
  const { t } = useApp()

  return (
    <article className="about">
      <header className="about__head">
        <h1>{t('Инструкция', 'Guide')}</h1>
        <p className="about__lead">
          {t(
            'Что нужно для переустановки Windows и как применить autounattend.xml.',
            'What you need to reinstall Windows and how to use autounattend.xml.',
          )}
        </p>
      </header>

      <div className="about__prose">
        <section>
          <h2>{t('Что нужно', 'What you need')}</h2>
          <ul>
            <li>
              {t(
                'Флешка от 8 ГБ (лучше 16+), все данные на ней будут стёрты',
                'USB stick 8 GB+ (16+ preferred); it will be wiped',
              )}
            </li>
            <li>
              {t(
                'Образ Windows 10/11 (ISO), например с',
                'Windows 10/11 ISO, for example from',
              )}{' '}
              <a
                href="https://massgrave.dev/genuine-installation-media"
                target="_blank"
                rel="noopener noreferrer"
              >
                massgrave.dev
              </a>
            </li>
            <li>
              {t('Программа записи:', 'Writer tool:')}{' '}
              <a
                href="https://rufus.ie/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Rufus
              </a>
              {', '}
              <a
                href="https://www.ventoy.net/en/download.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ventoy
              </a>
              {t(' или ', ' or ')}
              <a
                href="https://www.microsoft.com/software-download/windows11"
                target="_blank"
                rel="noopener noreferrer"
              >
                Media Creation Tool
              </a>
            </li>
            <li>
              {t(
                'ПК с UEFI (современные платы; Legacy/CSM лучше выключить)',
                'A UEFI PC (modern boards; prefer disabling Legacy/CSM)',
              )}
            </li>
            <li>
              {t(
                'Файл autounattend.xml из',
                'An autounattend.xml from',
              )}{' '}
              <Link href="/">{t('генератора WinTools', 'the WinTools generator')}</Link>
            </li>
          </ul>
        </section>

        <section>
          <h2>{t('Подготовка флешки', 'Prepare the USB')}</h2>
          <ol>
            <li>
              {t(
                'Запиши ISO на флешку (в Rufus обычно GPT + UEFI).',
                'Write the ISO to the USB (in Rufus usually GPT + UEFI).',
              )}
            </li>
            <li>
              {t(
                'Скачай autounattend.xml на главной странице WinTools.',
                'Download autounattend.xml from the WinTools home page.',
              )}
            </li>
            <li>
              {t(
                'Положи файл в корень флешки рядом с setup.exe. Имя файла должно быть',
                'Put the file in the USB root next to setup.exe. The file name must be',
              )}{' '}
              <code>autounattend.xml</code>.
            </li>
          </ol>
        </section>

        <section>
          <h2>{t('Загрузка с флешки', 'Boot from USB')}</h2>
          <ol>
            <li>
              {t(
                'Вставь флешку, перезагрузи ПК и открой Boot Menu (часто F12, Esc, F10 или F2, зависит от производителя).',
                'Insert the USB, reboot, and open the Boot Menu (often F12, Esc, F10, or F2, depending on the vendor).',
              )}
            </li>
            <li>
              {t(
                'Выбери флешку в режиме UEFI (не «USB Legacy»).',
                'Pick the USB in UEFI mode (not “USB Legacy”).',
              )}
            </li>
            <li>
              {t(
                'Если Secure Boot мешает, временно отключи его в BIOS или используй подписанный официальный образ.',
                'If Secure Boot blocks boot, temporarily disable it in BIOS or use a signed official image.',
              )}
            </li>
          </ol>
        </section>

        <section>
          <h2>{t('Что будет при установке', 'What happens during setup')}</h2>
          <p>
            {t(
              'Windows Setup подхватит autounattend.xml и применит язык, ключ, пользователя, разметку диска и т.д. без лишних вопросов, в пределах того, что ты отметил в генераторе.',
              'Windows Setup picks up autounattend.xml and applies language, key, user, disk layout, and so on, within what you configured in the generator.',
            )}
          </p>
          <ul>
            <li>
              {t(
                'Режим «раздел вручную»: диск выбираешь сам в Setup.',
                '“Pick partition in Setup”: you choose the disk yourself.',
              )}
            </li>
            <li>
              {t(
                'Режим wipe Disk 0: диск 0 будет очищен и размечен автоматически. Проверь, что это нужный диск.',
                'Wipe Disk 0: disk 0 will be erased and partitioned automatically. Make sure it is the right disk.',
              )}
            </li>
          </ul>
        </section>

        <section>
          <h2>{t('После установки', 'After install')}</h2>
          <p>
            {t(
              'При первом входе выполнятся команды из файла: удаление выбранных AppX и твики (панель задач, проводник и т.п.). Это может занять несколько минут, не выключай ПК сразу.',
              'On first logon the file’s commands run: removing selected AppX apps and applying tweaks (taskbar, Explorer, etc.). This can take a few minutes, so don’t power off right away.',
            )}
          </p>
        </section>

        <section>
          <h2>{t('Частые проблемы', 'Common issues')}</h2>
          <ul>
            <li>
              {t(
                'XML не сработал: файл не в корне, другое имя или флешка без setup.exe (неполный образ).',
                'XML ignored: not in the root, wrong name, or USB without setup.exe (incomplete image).',
              )}
            </li>
            <li>
              {t(
                'Не грузится с флешки: выбери UEFI-запись, другой порт USB, отключи Fast Boot.',
                'Won’t boot from USB: use UEFI write mode, try another USB port, disable Fast Boot.',
              )}
            </li>
            <li>
              {t(
                'Ошибка редакции/ключа: сверь редакцию в генераторе с ISO (Home/Pro/Enterprise).',
                'Edition/key error: match the generator edition to your ISO (Home/Pro/Enterprise).',
              )}
            </li>
            <li>
              {t(
                'Стерли не тот диск: при wipe Disk 0 всегда проверяй номер диска заранее.',
                'Wrong disk wiped: with wipe Disk 0 always verify the disk number first.',
              )}
            </li>
          </ul>
        </section>
      </div>
    </article>
  )
}
