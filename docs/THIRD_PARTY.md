# Third-party assets

## Fluent Emoji 3D (pictures in practice activities)
- Source: Microsoft Fluent Emoji — https://github.com/microsoft/fluentui-emoji
- Package: `@lobehub/fluent-emoji-3d` 1.1.0 (WebP conversion by LobeHub)
- Licence: MIT (Copyright © Microsoft Corporation; packaging © 2023 LobeHub). Commercial use allowed.
- How it is used: `scripts/copy-emoji.mjs` copies the images into `public/emoji/` before every build, so
  the site serves them itself (no third-party requests from students' devices). The database stores only
  the emoji code, e.g. `1f408`.

## Practice content
`content/starters.mts` is original material written for SHINING English. It follows the topics and word
lists Cambridge publishes for Pre A1 Starters but copies no exercise, text or picture from Cambridge
books ("Get Ready for Starters", Authentic Exam Papers) or from Global Success.
