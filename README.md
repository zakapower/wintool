# Wintool

Генератор `autounattend.xml` для автоустановки Windows 11.

**Wintool** — «инструмент Windows»: одна страница с якорями слева, скачивание файла ответов.

## Запуск

```bash
npm install
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm test
```

## Как пользоваться файлом

1. Настрой блоки на сайте и скачай `autounattend.xml`.
2. Положи файл в **корень** установочной флешки Windows (рядом с `setup.exe`).
3. Загрузись с флешки (UEFI).
4. Режим «стереть Диск 0» уничтожает данные на первом диске — используй осознанно.

Ключ продукта и пароль **не сохраняются** на сервере (генерация stateless).

## Стек

Next.js, React, TypeScript. UI в стиле соседних проектов (IBM Plex Sans, Literata, lucide, OverlayScrollbar).

Логика XML — собственный TypeScript builder. Идеи answer files / unattend пересекаются с экосистемой [cschneegans/unattend-generator](https://github.com/cschneegans/unattend-generator) (MIT); это не форк их сайта.
