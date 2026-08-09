# HANDOFF — 當前狀態(給 Claude / Codex / 接手的人)

> 最後更新:2026-08-09。**動手前先讀這份 + `AGENTS.md`(產品鐵律)。**
> ⚠️ 跨 AI 協作提醒:Claude 的私有記憶、Codex 的私有筆記**彼此讀不到** —— 所以「共享狀態」一律寫進這份 repo 文件,不要只寫在各自的記憶裡。

---

## 📱 App 發布狀態

- **v23 已送 Google 審查(2026-08-09)**:`versionCode 24` / `1.1.1`,封閉測試 **Alpha** 軌,發布總覽顯示「審查中的變更」。
  - 審查通常 7 天內。**控管型發布(managed publishing)開著** → 審完**要再到「發布總覽」按「發布」**才會到測試者手上。**只發最新那項(vc24),別按到舊版。**
- v22(`versionCode 22`)已於 2026-08-08 發布(舊版,不含下列改進)。
- **v23 帶的改進(皆已 commit 進 `main` 並 push):**
  - 🎨 深色燭光**預設主題** + **白天淺/夜晚深自動切換**(06–17 mist 淺 / 18–05 nocturne 深)。程式:`theme.ts` `autoDirection()` / `useAppStore` `themeAuto`+`refreshTheme` / `App.tsx` AppState 前景重算。
  - 🕯️ 危機求助卡(自傷字眼→浮現 1995)、弱網冷啟動自癒重試、匿名優先入場(18+ 後直接匿名進 Setup)、通知反模式修復(啟動不跳權限、送出首則訊息後才情境式問一次)、`SoftButton` 加 `loading` prop。

### Build 方式(重要)
- **`eas build -p android --profile production`**(EAS 雲端,~15–20 分)。**簽章金鑰在 EAS,本地 Gradle 簽不出 Play 能收的 AAB**,所以只能用 EAS。
- 上次 build 的 AAB:`~/Downloads/燭影私語_v23_vc24.aab`(82MB)。
- Play 上傳:`eas submit` **未設定**(無 service account)→ 目前是**手動下載 AAB → Play Console 上傳**。
- ⚠️ 模擬器 demo 坑:`expo run:ios --configuration Release` 跑**內嵌 bundle、不連 Metro** → 改了 JS 要**重 build** 才看得到(Metro 熱載入對 Release 無效)。首次乾淨 build ~40 分,之後 native 快取 ~數分。

---

## 📣 社群帳號狀態(詳見 `marketing/EXECUTION_STATUS.md`)

- **統一 handle:`@candlewhispertw`**(備選 `@candlewhisperapp`)。
- **Facebook 專頁**(`facebook.com/profile.php?id=61592516140200`):名稱/簡介/連結/釘選招募貼文都有;**大頭貼已設好(2026-08-09)**;⏳**封面待補**。
- **Instagram `@candlewhispertw`**:帳號 + 大頭貼**已建**;⏳ **0 貼文,待發第一篇**。
- **LinkedIn** 公司頁 + 首篇貼文已發。
- **其他**(Threads/TikTok/YT/LINE/X/Bilibili/小紅書):待完成(需真人驗證,見 EXECUTION_STATUS.md)。

### 素材位置
- `marketing/assets/`:`profile-avatar-1080.png`(大頭貼)、`channel-cover-master-v1.png`(封面)、`social-key-visual-v1.png`(貼文主視覺)。
- 另複製在 `~/Downloads/`:`燭影_fb大頭貼.png`、`燭影_fb封面.png`。

### ⚠️ AI 的硬限制(Claude 與 Codex 都一樣)
**「在系統檔案視窗選本機檔案上傳」自動化瀏覽器做不到** —— Claude 的 `file_upload` 拒絕本機路徑、Codex 的擴充也卡在檔案讀取。所以**上傳 FB 大頭貼/封面、IG 貼文圖這一步只有真人能點**。AI 可以:建帳號、寫簡介/文案、導航到上傳頁、生成圖檔;不能:替真人選本機檔上傳。

---

## ✅ 下一步(依序)
1. 等 Google 審 v23 → 核准信到 `xiangyi10200@gmail.com` → 到 Play「發布總覽」**按發布**(控管型)。
2. 放測試者前:**補活的預設火盆**(目前 0 個;`ensureOfficialRooms` 靠開 app 觸發,或加後台每晚 cron)、真人上**值班台**(`thirties-admin /dashboard/operator`)。
3. 招募:FB 補封面、IG 發第一篇(caption 見 `marketing/` 或問 Claude)、發 Dcard/Threads/PTT 導 `thirties-landing.vercel.app` 報名。報名表已串 Google Sheet(端到端測過)。
