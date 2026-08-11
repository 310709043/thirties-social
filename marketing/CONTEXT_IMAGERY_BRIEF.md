# 情境行銷圖 生成 Brief(給 Codex / 任何生圖 AI)

> **目的**:landing (`thirties-landing`) 現在放的是「手機框裡的乾淨截圖」= 只有介面、沒有「使用情境」。這份要產出**行銷等級的情境圖**:讓人看到「深夜、一個人、窩著滑手機,螢幕就是這個 app」——感覺到**什麼時候、為什麼**會用它。
>
> **執行者**:Claude 無法直接呼叫 Codex,靠這份 repo 文件交接。Codex(或 ChatGPT/DALL·E、Midjourney、Firefly 等任何生圖工具)照下方 prompt 生成 → 存到約定路徑 → 回報 Claude 嵌進版面。
>
> **⚠️ 花錢提醒**:多數生圖會消耗付費額度。動手前先確認老闆同意成本(對齊使用者「花錢前先確認」原則)。

## 品牌鐵律(生圖必守 — 違反直接重生)
- **陪伴,不是約會**:❌ 不要兩個人親密相依、約會感、性暗示。✅ 一個人的深夜、孤獨但被接住。
- **深夜燭光調性**:暖橘/琥珀微光 vs 近黑深影;溫柔、內斂、電影感、film grain。
- **不要**:stock 照的假笑、明亮歡樂打光、過飽和、任何 logo/浮水印/文字疊字(文字之後用 CSS 疊)。
- **調色**:暖金 `#e6a552`、亮金 `#ffd089`、米色 `#f4e9d2`、近黑底 `#070504`。

---

## 概念 A|氛圍主圖(不需要露出 app 螢幕,純情境)
**用途**:landing 一個「情境橫幅/hero」的背景,上面用 CSS 疊標題。
**Prompt(英文,生圖模型較準)**:
```
Cinematic photograph, a person lying awake alone in bed in a dark bedroom late at night, only a hand and part of the face softly lit by the warm amber glow of a phone just out of frame, intimate and melancholic, warm candlelight highlights against deep near-black shadows, shallow depth of field, blurred city night through a window, quiet solitude, emotional, subtle film grain, warm amber/gold-and-black color grade, photorealistic, 35mm. No text, no logo.
```
**Negative**:`two people, romance, dating, bright cheerful lighting, stock-photo smile, oversaturated, watermark, text, logo, cartoon`
**尺寸**:1920×1080(橫)或 1600×1200;JPEG。給 2–3 個變化版挑。

## 概念 B|手持裝置情境(要露出 app 介面 → 之後合成截圖)
**用途**:取代/升級「三個地方」那區的手機框——真正「手拿手機用 app」的情境。
**Prompt**:
```
Cinematic close-up photograph of a hand holding a smartphone in a dark, warm room at night, phone at a slight angle facing the camera, screen glowing warm, soft amber light spilling onto the fingers, deep shadows around, candlelit intimate late-night mood, shallow depth of field, cozy and melancholic, photorealistic, film grain, warm amber/gold and near-black color grade. IMPORTANT: keep the phone screen a clean, evenly-lit blank/neutral rectangle so a UI screenshot can be composited in later. No text, no logo.
```
**Negative**:同上 + `busy screen content, fake ui`
**尺寸**:直式 1080×1440;JPEG。

### 合成步驟(概念 B 生完後)
1. 把真實 app 截圖 `thirties-landing/screens/screen-1.jpg`(或 2/3)疊到生成圖裡手機的螢幕矩形上,對齊透視。
2. 加一點螢幕光暈/反光、稍降亮度融入夜色。
3. 工具:Photoshop / Figma / Canva / Adobe 皆可。

---

## 產出交付
- 存到 **`thirties-landing/screens/context-A.jpg`**(氛圍)、**`context-B.jpg`**(手持)等;變化版加 `-v2/-v3`。
- 完成後在這份文件下方記一行「已產出 X 張,路徑 Y」,或直接告訴 Claude → Claude 負責嵌進 landing(情境橫幅 or 升級 mockups 區)並部署。

## 待產出清單
- [ ] 概念 A 氛圍主圖 ×2–3
- [ ] 概念 B 手持情境 ×2–3(留白螢幕待合成)
- [ ] 合成:真實 app 截圖嵌入概念 B
