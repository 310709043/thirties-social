---
name: voice-lint
description: Scan user-facing copy for voice regressions — dating/match-making framing and AI-assistant tone — that violate the 燭影私語 product mandate. Use before any build, after any copy or screen edit, or when reviewing an AI/codex pass over the UI.
---

# voice-lint — 守住文案語氣鐵律

燭影私語是**匿名情緒陪伴空間**，不是約會 app，也不做任何 AI 功能。文案語氣最容易在 AI/codex 改動後悄悄倒退，這個 skill 一鍵抓出來。

## 怎麼跑

```bash
npm run lint:voice
```

- 掃 `src/lib/copy.ts` + `src/screens/*.tsx`
- 有違規 → 印出 `檔案:行號 [原因] + 該行內容`，exit 1
- 乾淨 → 印 ✅，exit 0

## 抓什麼（兩類硬違規）

1. **約會化框架** — 底層 1 對 1 機制可以叫「配對／Match」，但**敘事不能浪漫化**：
   `遇見一個人/對的人`、`脫單`、`找對象`、`同頻的人`、`the right person`、`meet someone`、`soulmate` 等。
2. **AI 助理口吻** — 第一人稱「我幫你／讓我為你…」像聊天機器人；以及 `智能／AI／演算法推薦／自動配對給你`。

## 判讀與修法

- **不是**單純把「配對」全部殺掉——`每日 10 次配對`、`MatchScreen` 這種機制詞/畫面名是允許的。
- 修法方向：`遇見一個人` → `找一個人說說話`；`同頻的人` → `今晚怎麼陪你`；`我們替你找` → 拿掉助理口吻。
- 依據見 `AGENTS.md` 的產品鐵律；不確定就**停下來問使用者**，不要自己往約會/AI 詮釋。

## 何時用

- 每次改 `copy.ts` 或任何 screen 文案後
- Review codex / AI 的 UI pass 後（最容易倒退的時機）
- `pre-build-check` 會自動включ它；`npm run check` 也已串進去
