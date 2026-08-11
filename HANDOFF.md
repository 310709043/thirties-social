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

- **⏳ 待下個 build(v24)的純 JS 改動(已 commit `main`,尚未建置;純 JS 但不能單獨 OTA,要跟 build 走):**
  - ⚡ **火盆大廳輪詢改 focus-gated**(`MoodScreen.tsx` `subscribeToActiveRooms` 從 `useEffect([])` 改 `useFocusEffect`)。原本大廳在 native stack 下整晚常駐輪詢(進聊天室也還在背景跑)= 規模下最大讀取來源;改成離開大廳就暫停、回來即刷新。100 人一晚讀取量估可砍 3–5 成。⚠️ 這是 Firestore 讀取優化,**真正的容量前提仍是 Firebase 要在 Blaze**(Spark 免費每日 5萬讀,100 人開場約 10 分鐘就爆停)——見下方「容量/成本」。

### Build 方式(重要)
- **`eas build -p android --profile production`**(EAS 雲端,~15–20 分)。**簽章金鑰在 EAS,本地 Gradle 簽不出 Play 能收的 AAB**,所以只能用 EAS。
- 上次 build 的 AAB:`~/Downloads/燭影私語_v23_vc24.aab`(82MB)。
- Play 上傳:`eas submit` **未設定**(無 service account)→ 目前是**手動下載 AAB → Play Console 上傳**。
- ⚠️ 模擬器 demo 坑:`expo run:ios --configuration Release` 跑**內嵌 bundle、不連 Metro** → 改了 JS 要**重 build** 才看得到(Metro 熱載入對 Release 無效)。首次乾淨 build ~40 分,之後 native 快取 ~數分。

---

## ⚠️ 容量 / 成本(Firebase 方案 — 放量前必看,2026-08-11 盤點)

即時路徑(配對/聊天/火盆)是 **client 直連 Firestore**,不經後端,所以「多少人能同時上線」= Firestore 問題,不是機器馬力。

- 🔴 **頭號風險是 Firebase 方案,不是流量。** 若在**免費 Spark**(每日 5萬讀/2萬寫 硬上限):**100 人同時上線,開場約 8–10 分鐘就把讀取配額燒光 → Firestore 對所有人回 `RESOURCE_EXHAUSTED`,app 當晚停擺到太平洋午夜配額重置**(硬停,非變慢)。
  - 架構強烈暗示目前在 Spark(照片走 Cloudinary 非 Firebase Storage、後端走 Vercel 非 Cloud Functions = 刻意繞開需 Blaze 的功能)。**放量前務必去 Console → Usage and billing 確認,若非 Blaze 要升級**(升 Blaze=綁卡按量計費=花錢,老闆自己操作)。
- 🟢 **錢不是問題**:估 100 人 × 3 小時 ≈ 100 萬讀 + 8 萬寫;在 Blaze ≈ **$0.7 美元/晚**(就算低估 3 倍也才 ~$2)。天天 100 人也才 ~$20–60/月。
- 建議:上 Blaze 同時設 **Cloud Billing 預算告警**($5/天 或 $50/月 + email),當「跑掉的迴圈 bug」跳電開關。
- 讀取優化已做一項(見上「待下個 build」火盆大廳 focus-gate);其餘設計(訊息計數器熱點、心跳頻率)已查為「優雅降級、不會壞」。

---

## 📣 社群帳號狀態(詳見 `marketing/EXECUTION_STATUS.md`)

- **統一 handle:`@candlewhispertw`**(備選 `@candlewhisperapp`)。
- **Facebook 專頁**(`facebook.com/profile.php?id=61592516140200`):名稱/簡介/連結/釘選招募貼文都有;**大頭貼已設好(2026-08-09)**;⏳**封面待補**。
- **Instagram `@candlewhispertw`**:帳號 + 大頭貼**已建**;貼文由**自動發文器**負責(見下「社群發文自動化」)。
- **LinkedIn** 公司頁 + 首篇貼文已發。
- **其他**(Threads/TikTok/YT/LINE/X/Bilibili/小紅書):待完成(需真人驗證,見 EXECUTION_STATUS.md)。

### 🤖 社群發文自動化(重要 — 2026-08-12 盤點+修復)
- **IG 有一套 Codex 建的自動發文器**(不是手動):`thirties-admin` cron `/api/cron/instagram-publish`,每天 13:30 UTC 跑,**只在週一/三/五發**(台北時間),12 則內容 4 週常青輪替,內容寫死在 `src/lib/instagram/content.ts`(語氣守鐵律 + alpha CTA + UTM)。憑證(`INSTAGRAM_*` ×5)已設在 Vercel Production。走 IG Graph API、圖**公開掛在 landing** 讓 IG 用 URL 抓 → **繞過「AI 不能傳本機檔」那道牆**(所以上面那條硬限制對 IG 自動發不適用)。
- 🔴 **曾經是壞的**:首發(2026-08-10 週一)`status: failed / error: "Failed to decode"` —— 因為圖是 **PNG,而 IG Graph API 只吃 JPEG**。(用唯讀查 `instagramPublicationJobs` 確認的。)
- ✅ **已修(2026-08-12)**:8 張圖(週一/五×4 週)轉 **JPEG**、`content.ts` 路徑改 `.jpg`、landing + admin 都已 `vercel --prod`,線上驗過回 `image/jpeg`。**下一則圖貼文(週五 8/14)應會成功發出**。⚠️ **週三是 Reels(.mp4)另一條路徑、尚未驗證**,盯下次週三跑;8/10 那則失敗的不會補發(日期已過)。**最終確認**=下次跑完再查一次 `instagramPublicationJobs` 該 dateKey 是否 `published`。
- **分工**:IG = 自動(3 篇/週);**手動發文(`marketing/POSTING_CADENCE_2X_WEEKLY.md`)只做 FB / 之後 Threads,別重複發 IG。**
- ✅ `thirties-landing` **已備份 GitHub**(private,`github.com/310709043/thirties-landing`,2026-08-12 建);仍靠 `vercel --prod` 部署上線。圖(png/mp4)依 `.gitignore` 不進 git(Remotion 生成、備 OneDrive),但我加的 **.jpg 有進 git**。
- ✅ **JPEG 修復已根治(2026-08-12)**:`thirties-landing` 的 `video/scripts/render-instagram.mjs` 已改成 **still 輸出 JPEG**(`--image-format=jpeg --jpeg-quality=90`,副檔名也改 `.jpg`)。所以**重跑 `render:instagram` 不會再產出 PNG、不會再讓 IG 壞**。8 張正式圖已用修好的管線重渲(正宗 JFIF JPEG)、重部署、線上驗過 `image/jpeg`。(週三 Reels 仍是 `.mp4`,未變。)

### 素材位置
- `marketing/assets/`:`profile-avatar-1080.png`(大頭貼)、`channel-cover-master-v1.png`(封面)、`social-key-visual-v1.png`(貼文主視覺)。
- 另複製在 `~/Downloads/`:`燭影_fb大頭貼.png`、`燭影_fb封面.png`。

### ⚠️ AI 的硬限制(Claude 與 Codex 都一樣)
**「在系統檔案視窗選本機檔案上傳」自動化瀏覽器做不到** —— Claude 的 `file_upload` 拒絕本機路徑、Codex 的擴充也卡在檔案讀取。所以**上傳 FB 大頭貼/封面、IG 貼文圖這一步只有真人能點**。AI 可以:建帳號、寫簡介/文案、導航到上傳頁、生成圖檔;不能:替真人選本機檔上傳。

---

## ✅ 下一步(依序)
1. 等 Google 審 v23 → 核准信到 `xiangyi10200@gmail.com` → 到 Play「發布總覽」**按發布**(控管型)。
2. 放測試者前:真人上**值班台**(`thirties-admin /dashboard/operator`)。
   - 🔥 **火盆自動化已做(2026-08-09,Claude)**:根因是 app 端 `ensureOfficialRooms` 只在「有人開 app 進主畫面」時才建火盆(`MoodScreen.tsx:226`),而後台 `cleanup-rooms` cron 又會刪過期房 → 一天沒人開就變 0 個火盆、陌生人打開見空城。**修法**:在 `thirties-admin` 新增 `src/lib/ensureOfficialRooms.ts`(server 版,逐字複製 app 的題庫/FNV-1a hash/roomKey/房間文件結構,並把夜間日期做 UTC→台灣時區校正),接進 `cleanup-rooms` cron(Hobby 只有 2 cron 槽、已滿,故搭在刪除後補種;idempotent、與 client 同 key 不重複)。**tsc/eslint 過、時區與題庫已用腳本對拍一致**。⏳ **待部署**(`cd ~/thirties-admin && npx vercel --prod`)——部署後每天 04:00 UTC(台灣 12:00)自動補種當晚兩把火盆。⚠️ 只解「空城壞掉感」,**不生出真人**;真人氣仍靠第一晚揪人劇本。要立刻補種當晚:部署後手動打 cron 端點(帶 `CRON_SECRET`)或開一次 app 即可。
3. 招募:FB 補封面、IG 發第一篇(caption 見 `marketing/` 或問 Claude)、發 Dcard/Threads/PTT 導 `thirties-landing.vercel.app` 報名。報名表已串 Google Sheet(端到端測過)。
   - 🕯️ **第一晚「揪人同時上線」執行單**:`marketing/FIRST_NIGHT_RECRUITING.md`(分波名單模板 + 三段邀請訊息 + 值班時間表 + Go/No-Go 成功線)。專攻冷啟動「同一時段湊 5–10 人」;逐步傍晚時程/話術仍見 OneDrive `第一晚上線執行卡.md` / `陪聊值班話術手冊.md`(本單不重複那些)。
