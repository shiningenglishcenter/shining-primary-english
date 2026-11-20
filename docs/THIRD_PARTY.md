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

## UI/UX Pro Max skill (developer tool, not shipped to users)
- Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (commit 2de1134, 2026-11-19)
- Licence: MIT (Copyright © 2024 Next Level Builder) — copy in `.claude/skills/ui-ux-pro-max/LICENSE`.
- How it is used: a Claude Code skill (local Python search over CSV design guidelines) used while building
  teacher/admin screens and as an accessibility checklist. See `docs/DESIGN_SYSTEM.md` §7. Its test folder
  was left out.

## Emoji names for the picture picker (emojibase-data)
- Source: https://github.com/milesj/emojibase — package `emojibase-data` 17.0.0 (dev dependency).
- Licence: MIT (Copyright © 2017-2019 Miles Johnson); the names and keywords come from Unicode CLDR
  (Unicode License v3).
- How it is used: `scripts/copy-emoji.mjs` builds `public/emoji/index.json` (English and Vietnamese names and
  keywords of emoji that have a Fluent picture) for the editor's search. Nothing is requested from outside.

## Composed pictures (C1)
- `scripts/make-pictures.mjs` combines Fluent Emoji 3D images (MIT, above) with simple drawn shapes (walking
  stick, jump arc, grass) into `public/emoji/f0001.webp`–`f0005.webp` at build time, using `sharp` (Apache-2.0).

## British IPA (Britfone)
- Source: https://github.com/JoseLlarena/Britfone (version 3.0.1)
- Licence: MIT (Copyright © 2017 Jose Llarena).
- How it is used: `scripts/make-ipa.mts` turns the entries for the app's seeded words into dictionary-style IPA
  in `content/ipa.mts` (154 words; "crayon" and "mango" written by hand). Migration 0031 seeds them into
  `vocabulary.ipa`; teachers can edit them. The full dictionary is not in the repository.
