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
                'Флешка от 8 ГБ (лучше 16+). Все данные на ней будут стёрты.',
                'USB stick 8 GB+ (16+ preferred). Everything on it will be wiped.',
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
              .
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
              .
            </li>
            <li>
              {t(
                'ПК с UEFI. На современных платах Legacy/CSM лучше выключить.',
                'A UEFI PC. On modern boards, Legacy/CSM is better disabled.',
              )}
            </li>
            <li>
              {t(
                'Файл autounattend.xml из',
                'An autounattend.xml from',
              )}{' '}
              <Link href="/">{t('генератора WinTools', 'the WinTools generator')}</Link>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2>{t('Подготовка флешки', 'Prepare the USB')}</h2>
          <ol>
            <li>
              {t(
                'Запишите ISO на флешку. В Rufus обычно выбирают GPT и UEFI.',
                'Write the ISO to the USB. In Rufus, GPT and UEFI are the usual choices.',
              )}
            </li>
            <li>
              {t(
                'Скачайте autounattend.xml на главной странице WinTools.',
                'Download autounattend.xml from the WinTools home page.',
              )}
            </li>
            <li>
              {t(
                'Положите файл в корень флешки рядом с setup.exe. Имя файла должно быть',
                'Place the file in the USB root next to setup.exe. The file name must be',
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
                'Вставьте флешку, перезагрузите ПК и откройте Boot Menu. Клавиша зависит от производителя ноутбука или материнской платы (часто F12, Esc, F10 или F2), а не от видеокарты.',
                'Insert the USB, restart the PC, and open the Boot Menu. The key depends on the laptop or motherboard maker (often F12, Esc, F10, or F2), not the graphics card.',
              )}
            </li>
            <li>
              {t(
                'Выберите флешку в режиме UEFI, не «USB Legacy».',
                'Select the USB in UEFI mode, not “USB Legacy”.',
              )}
            </li>
            <li>
              {t(
                'Если Secure Boot мешает, временно отключите его в BIOS или используйте подписанный официальный образ.',
                'If Secure Boot blocks boot, temporarily disable it in BIOS or use a signed official image.',
              )}
            </li>
          </ol>
        </section>

        <section>
          <h2>{t('Что будет при установке', 'What happens during setup')}</h2>
          <p>
            {t(
              'Windows Setup подхватит autounattend.xml и применит язык, ключ, пользователя, разметку диска и другие параметры без лишних вопросов, в пределах того, что вы отметили в генераторе.',
              'Windows Setup picks up autounattend.xml and applies language, key, user, disk layout, and other options without extra prompts, within what you configured in the generator.',
            )}
          </p>
          <ul>
            <li>
              {t(
                'Режим «раздел вручную»: диск выбираете сами в Setup.',
                '“Pick partition in Setup”: you choose the disk yourself in Setup.',
              )}
            </li>
            <li>
              {t(
                'Режим wipe Disk 0: диск 0 будет очищен и размечен автоматически. Убедитесь, что это нужный диск.',
                'Wipe Disk 0: disk 0 will be erased and partitioned automatically. Make sure it is the correct disk.',
              )}
            </li>
          </ul>
        </section>

        <section>
          <h2>{t('После установки', 'After install')}</h2>
          <p>
            {t(
              'При первом входе выполнятся команды из файла: удаление выбранных AppX и твики (панель задач, проводник и т.п.). Это может занять несколько минут. Не выключайте ПК сразу.',
              'On first logon the file’s commands run: removing selected AppX apps and applying tweaks (taskbar, Explorer, and so on). This can take a few minutes. Do not power off the PC right away.',
            )}
          </p>
        </section>

        <section>
          <h2>{t('Частые проблемы', 'Common issues')}</h2>
          <ul>
            <li>
              <strong>{t('XML не сработал.', 'XML did not apply.')}</strong>{' '}
              {t(
                'Файл не в корне, другое имя или на флешке нет setup.exe (неполный образ).',
                'The file is not in the root, has another name, or the USB has no setup.exe (incomplete image).',
              )}
            </li>
            <li>
              <strong>{t('Не загружается с флешки.', 'Will not boot from USB.')}</strong>{' '}
              {t(
                'Выберите запись в режиме UEFI, попробуйте другой порт USB, отключите Fast Boot.',
                'Use UEFI write mode, try another USB port, and disable Fast Boot.',
              )}
            </li>
            <li>
              <strong>{t('Ошибка редакции или ключа.', 'Edition or key error.')}</strong>{' '}
              {t(
                'Сверьте редакцию в генераторе с ISO (Home, Pro, Enterprise).',
                'Match the generator edition to your ISO (Home, Pro, Enterprise).',
              )}
            </li>
            <li>
              <strong>{t('Стёрт не тот диск.', 'Wrong disk was wiped.')}</strong>{' '}
              {t(
                'При wipe Disk 0 заранее проверяйте номер диска.',
                'With wipe Disk 0, verify the disk number in advance.',
              )}
            </li>
          </ul>
        </section>
      </div>
    </article>
  )
}
