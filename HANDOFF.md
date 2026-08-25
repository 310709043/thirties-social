# HANDOFF — 當前狀態(給 Claude / Codex / 接手的人)

> 最後更新:2026-08-25。**動手前先讀這份 + `AGENTS.md`(產品鐵律)。**
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
  - 🕯️ **燭光歡迎頁 `HeroScreen`(新用戶首個畫面)** —— ⚠️ **還在 PR、尚未併入 `main`**:[PR #3](https://github.com/310709043/thirties-social/pull/3) 分支 `feat/hero-candlelight-welcome`(commit `70de7bd`),**要先 merge 才會進 build**。全螢幕燭光歡迎:`VaporBackground`+`NightAtmosphere`+一片 `Flame` 燭火、錯開淡入標題、燭焰 CTA;`App.tsx` `!onboardingDone → Hero`(CTA→Onboarding)、`navigation` 註冊 `Hero` 路由。純 JS、零新增原生依賴(**刻意不用影片/expo-video 以避開 OTA 地雷**),語氣過 voice-lint。曾試作「發光鑰匙孔 + 拖曳窺孔 reveal(SVG Mask)」但老闆覺得醜、已全移除,只留燭火版。
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
- **分工**:IG = 自動(3 篇/週);**手動發文(`marketing/POSTING_CADENCE_2X_WEEKLY.md`)只做 FB / 之後 Threads,別重複發 IG。** FB 內容在 `marketing/FB_CONTENT.md`(手動,新頁零觸及、僅社會證明)。
- 👁️ **失敗可見性(2026-08-12)**:後台 **`/dashboard/instagram`** 顯示自動發文開關狀態 + 每筆 job(日期/內容/類型/狀態/嘗試/錯誤)+ 有失敗就紅字警示。治「壞了沒人看」根因(PNG bug 曾靜默失敗 3 天)。**上線後養成登入瞄一眼的習慣。**
- ✅ `thirties-landing` **已備份 GitHub**(private,`github.com/310709043/thirties-landing`,2026-08-12 建);仍靠 `vercel --prod` 部署上線。圖(png/mp4)依 `.gitignore` 不進 git(Remotion 生成、備 OneDrive),但我加的 **.jpg 有進 git**。
- ✅ **JPEG 修復已根治(2026-08-12)**:`thirties-landing` 的 `video/scripts/render-instagram.mjs` 已改成 **still 輸出 JPEG**(`--image-format=jpeg --jpeg-quality=90`,副檔名也改 `.jpg`)。所以**重跑 `render:instagram` 不會再產出 PNG、不會再讓 IG 壞**。8 張正式圖已用修好的管線重渲(正宗 JFIF JPEG)、重部署、線上驗過 `image/jpeg`。(週三 Reels 仍是 `.mp4`,未變。)
- ❌→✅ **Reels 其實壞了、已修(2026-08-13 訂正)**:我 8/12 寫「Reels 規格健康」是**錯的**——規格檢查**漏看了 pixel format**。週三 Reels(week-1-wednesday)8/12 實跑 `Failed to decode` 失敗。真因:Remotion 輸出 **full-range `yuvj420p` + 色彩空間 `bt470bg`**,IG 解碼器只吃 **`yuv420p` / tv range / `bt709`**(跟圖片 PNG 問題同性質=格式不對)。**已修**:4 支 mp4 用 ffmpeg 重編碼成 IG 標準色彩(+faststart)、重部署、線上驗過 `yuv420p/bt709`;**已根治**:`render-instagram.mjs` 加 render→ffmpeg 轉碼步驟(commit `d186687`),重跑不再壞。⚠️ timeout 40s 隱憂仍在(見上一版說明)但短片通常 OK。**下次驗證=週三 8/19 跑完 probe。**
- 📌 **目前 IG 發文戰績:0 成功 / 2 失敗**(8/10 圖 PNG、8/12 Reels 色彩,兩者皆已修)。**第一則成功預計 = 週五 8/14 的圖**(JPEG 修復,尚未實跑驗證)。看 `/dashboard/instagram` 或 probe `instagramPublicationJobs` 追蹤。

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

---

## 🎨 設計交接包重構(進行中,2026-08-16,Claude)

> 來源:`~/Downloads/design_handoff_candle_whisper`(README + `design/*.dc.html` 設計參考)。老闆拍板:**整包全做**(三波 11 項)、**火盆訊息保留 3 天**、**方案 A 火盆優先**。

### ✅ 已完成(typecheck + `npm run check` 全綠;**尚未 build,尚未 push**)
- **前置 token/對比**(`theme.ts`/`ui/index.tsx`):nocturne `muted` .5→.62(修 P8 對比 3.4:1)、深色文字 `#1a1530`/`#15172e`→`#1f1014`、新增 `LOFT_PALETTE_V2`(夜閣紫調 W3-9 用)、`LETTER_PALETTE`(回顧信亮色 W2-8 用)。
- **前置 store 資料模型**(`useAppStore.ts`):新增 `guestBrowsing`/`pendingInvites`/`inviteContext`/`sigil`/`savedPeople`(上限3)/`streakNights` + 型別 `Invite`/`InviteContext`/`SavedPerson` + 常數 `INVITE/EXTEND/REUNION_WICK_COST`=2/2/3、`SAVED_PEOPLE_MAX`=3 + setters。
- **W1-1 資料層**(`db.ts`):`ROOM_MESSAGE_TTL_MS`=3天、`sendRoomMessage` 每則蓋 `expiresAt`、三條讀取路徑加 `roomMessageLive` 過濾(過期字不渲染)、新增 `fetchReadableRooms`(給訪客/第一位到場看「昨晚的話」)。
- **W1-2 誠實的等候**(`components/ui/HonestWaiting.tsx` 新元件 + `MoodScreen.tsx`):取代無限 spinner/60秒彈窗。全螢幕誠實 overlay——**真實** `awakeCount` + `fetchWaitingQueueCount`(新增,真數字,不灌水)、標明是「典型時段人潮」的長條圖(非假的「今晚」即時數)、兩個出口(去火盆坐著〔W1-1 讓 0 人也有話可讀〕/先把話寫下來)、誠實 footer「沒有人就是沒有人」。移除舊 `WaitingDots`/`WaitStatus`/相關 styles。
  - 🧭 **PM 微調(偏離交接包但守鐵律)**:交接包原本主鈕是「有人上線就通知我」,但**通知上線的後端 infra 不存在**,做了會違反「誠實優先」鐵律(承諾做不到的事)。改成「先去火盆坐著」——W1-1 剛好讓空城也有昨晚的話可讀,是誠實又對味的出口。要補真的「上線通知」需另做 presence→push 後端。

### ✅ W1-1 後端 companion(已完成,2026-08-16)—— 兩端都通了
1. **`thirties-admin` `cleanup-rooms` cron 已改兩階段**(`src/app/api/cron/cleanup-rooms/route.ts`,tsc/eslint 過):過 `closesAt` → **退役**(`isActive:false`,退出大廳但保留可讀);過 `closesAt + 3天` → 才 `recursiveDelete`。回傳多一個 `retired` 計數。⏳ **待部署**(`cd ~/thirties-admin && npx vercel --prod`)。
2. **Firestore rules 本就相容**——`rooms` 與 `messages` 都 `allow read: if request.auth != null`(已關閉的房仍可讀),寫入維持 `isActive==true && closesAt > request.time`(符合 security-regression `expired rooms reject new messages`)。**不需改 rules。**
3. **app 讀取面已加 `fetchReadableRooms`**(`db.ts`):回「開著的 + 3 天內關閉的、且有訊息的」房,給訪客/第一位到場的人看「昨晚的訊息」。大廳仍用 `fetchActiveRooms`(只回開著的)。
- ✅ RoomScreen 已熄房唯讀 banner 已於 W1-3(#5)補上。

### ✅ W1-3 訪客先聽再註冊(#5,已完成)
- `AuthScreen`:訪客入口改**登入/註冊兩 mode 都顯示**(原只 login),且訪客**不再進 Setup**,直接 `replace('Mood')` + `setGuestBrowsing(true)`。
- `MoodScreen`:訪客隱藏 ritualCard(心情輸入+模式選擇,對訪客無效)、改「先聽聽這裡的人在說什麼」標題、火盆區永遠展開、用 `fetchReadableRooms` 顯示**含昨晚可讀的**火盆(最多3)、加「為什麼看得到昨晚的話」+「點一句就好」提示。
- `RoomScreen`:訪客點某則訊息 → 升起**帶引言的註冊 sheet**(quote + 「要開口，需要一個只有今晚的名字」),並存 `inviteContext` 供註冊後 W2-6 沿用;**已熄但可讀的房**→ 唯讀 banner(不讓送訊息 silent fail)。
- `SettingsScreen`:刪掉「訪客會失去燭芯、訂閱」的**不可能狀態**文案(訪客本就不能買),改成誠實的「訪客綁這支手機、重裝失去歷史」。

### ✅ W1-4 燭芯規則收成一頁(#6,已完成)—— 修 P5
- `UpgradeScreen`:把埋在「+ 什麼時候用燭芯」摺疊裡的規則,改成**常駐可見的單一真實來源**卡片:三種核心用法(邀請/續30分2/重逢3)+「永遠免費」綠框 + 「燭芯買不到」紅框。
- `copy.ts`:`wicksBlurb` 從模糊的「聊天不用花燭芯」改成「訊息不用燭芯,燭芯只讓對話走得更久——規則就在下面」,消 P5 矛盾。
- 🧭 **PM 判斷(尊重交接包自己的波次)**:交接包把「邀請=2芯」放在**它的 Wave 2**(#10),把移除照片/夜閣扣費放 **Wave 3**。所以「只有三種用法」的絕對宣稱、以及 invite 從 1→2 的**改價**都留到 #10/#13——那時只需更新這一頁(單一來源的意義)。現在若硬說「只有三種/買不到照片」會與尚存的帶紗照片/夜閣心跳扣費打架,不誠實。故 Wave 1 只做「單一來源頁 + 消矛盾」,改價是 Wave 2。persona-regression 鎖著配額經濟模型,改價要連它一起改。

### ✅ W1-1 後端已部署(2026-08-16)
`cd ~/thirties-admin && npx vercel --prod` 已跑,`readyState: READY / target: production`。火盆 3 天保留的 cron 兩階段邏輯已上線,下個排程(每天 04:00 UTC)生效。

### ✅ W3-10 Setup 三步→兩步(#14,已完成)
`SetupScreen`:移除中間「關係現況」步(感情狀態 9 選 + 它現在的樣子 3 選)——最 affair-coded 的選項(開放關係/無性了)也一併消失,更貼陪伴非約會鐵律。剩性別+年齡、意圖+邊界兩步。既有值保留、不強制;完整的「個人頁選填編輯器」留待 ProfileScreen(follow-up)。tsc/`npm run check` 綠。

### 🔓 夜閣時間閘 = 全天開放(老闆拍板,2026-08-19)——**不要改回 0**
老闆決定夜閣**永久全天開放**(冷啟動流動性:少人時不該把人擠進 02:00–05:00 沒人的三小時)。`eas.json` production `EXPO_PUBLIC_LOFT_ALWAYS_OPEN=1` 是**正式行為,不是臨時測試開關**。文案已改誠實:`loftClose`「每晚都開著」、`loftTagline`「給每個睡不著的夜」(移除假的「02:00–05:00 / 三個小時」宣稱,守誠實鐵律)。db.ts 的 02:00–05:00 gate 常數留著當「萬一切回 0」的 fallback(全天開時 `isLoftOpen` 一律 true,不觸發)。**⚠️ 前一版 HANDOFF 寫「上線前改回 0」已作廢。**

### 🟡 W3-9 夜閣重定義(#13,核心完成/polish 待續)
- ✅ **已修 P6 鐵律違反(最關鍵、最可見)**:進場畫面文案全改(`copy.ts` loft*)——移除「被想念一次/帶紗照片、交心/私下金錢往來永久封鎖」,改成「給睡不著的那三個小時」+「沒有照片、沒有名單、沒有邀請」+四條與火盆差別;**移除帶一張照片進來的上傳入口**(LoftScreen);LoftGuide 第三格從「帶紗照片、掀面紗」改「留不住·10 分鐘消失」;開放時間文案 21:00→02:00–05:00。
- ⏳ **待續(polish,非 trust-blocker)**:LoftChatScreen 的 pulse(想你/躺下了/有你真好)+ 掀面紗 veil-lift UI 尚未移除——但**照片上傳已拔掉 → 無照片流入 → veil 實際上已 inert**;pulse 文案偏親密待重寫。紫調 reskin(LOFT_PALETTE→LOFT_PALETTE_V2)未做(視覺 polish,動到 954 行內大量 L. 參照,低 trust 價值故延後)。時間閘仍沿用刻意的 always-open 冷啟動繞過(EXPO_PUBLIC_LOFT_ALWAYS_OPEN),未改回真的 02:00–05:00 gate(放量前先保持好進入)。

### ✅ 又完成(2026-08-16 同日第二批,皆 `npm run check` 綠)
- **#11 對話延續抽屜(修 P1)**:ChatScreen 三個 12px 入口(續燭/重逢/留下彼此)收成**一個 <5 分自動升起的抽屜**(`ContinueOption`);點計時器或自動浮現。
- **#15 留下彼此**:守夜會員閘(本就有)+ **上限 3 人**(`canSavePerson`/`SAVED_PEOPLE_MAX`)+ 雙方確認後 `savePerson`(暱稱=對方今晚名,可日後改)。⚠️ 存的 handle 是**每日 seed**(非永久)→ 跨夜認得同一人需 #8 永久星圖廣播(見下方隱私決策)。
- **#7 logo**:整支換成門+燭+鑰匙孔(`Logo.tsx`,512 viewBox,尺寸階梯 96/56/32/24/16、深色版 #c99154、火焰=貨幣 glyph `WickCurrencyGlyph`)。舊的燭台九圖形已淘汰。
- **#8 安全部分**:砍「全部 16 種身份」賣點(copy + UpgradeScreen ×2)、夜閣第二套名 `getLoftName` → 統一用 `getColorAdj().label`(LoftScreen/ProfileScreen)。
  - 🔒 **#8 延後的部分(PM 決定,守 launch 信任)**:(1)**永久星圖廣播**給陌生人以「跨夜認得」——會反轉 identity.ts 每日雜湊種子的 H5 匿名設計,不在上線衝刺硬上,留你日後明確拍板;(2)名庫擴充——identity-regression 強制**五個池等長**(`.size===1`),要擴得連發明 48 個不重複 hex + 改回歸測試,高風險低價值(color+sigil 視覺本就能區分),延後;(3)星圖新 renderer 是視覺 polish,非阻擋。

### ✅ #10 前端也完成了(2026-08-16,端到端可用,已 commit)
RoomScreen A3 抽屜(引言+選填留言+免費送出)、`InviteScreen` A4(接受/看下一個/不想被打擾,拒絕零成本)、MoodScreen 邀請匣 banner、ChatScreen 男方首則訊息扣 2 芯(女生/守夜免費)、`Invite` 路由已註冊。男方經「有人為你開了一扇窗」banner 進場(不雙扣)。**#9 核心(邀請匣)也隨之完成。**

### ✅ 又完成(2026-08-16 第四批,已在 main)
- **#12 隔日回顧信**:`ReviewLetterScreen`(唯一亮底畫面,LETTER_PALETTE)——**只用誠實本機資料**(昨晚說了幾句 `saidLastNight`、連續 `streakNights`),**不造假「被 N 人記住」**(那要後端,刻意不做)。`trackSaid` 每則 1:1 訊息計數、03:00 跨夜快照;`scheduleMorningLetter` 08:00 每日推播(tap→ReviewLetter,App.tsx 已按 data.screen 路由);MoodScreen 有進場卡。
- **#8 星圖 renderer**:`Sigil.tsx` 換成 3×3 點陣折線,**用該身分的 swatch 顏色**(最強辨識線索,修「28px 六人一樣」),一個亮點。綁每日種子=夜內穩、每日換,**不引入跨日連結**。加上先前的砍16身份/統一夜閣名/真實連續晚數 → 三層系統(名字/星圖/私人暱稱)都到位。

### ⏳ 真正剩下的(2 項,都非阻擋上線)
- **#8「永久」廣播(跨夜認得陌生人)**:反轉 H5 匿名,**待老闆拍板**(見下)。星圖視覺已上,只差「要不要讓它跨夜不變並廣播」。名庫擴充(五池等長回歸鎖死、需發明 48 hex)低價值高風險,延後——星圖顏色已大幅改善辨識。
- **#9 A1/A2 細分 / #13 紫調 reskin**:前者是產品賭注(女生端拿掉發起 CTA,低量時恐沒事做),後者純視覺。都留 post-launch。

**狀態**:全部已在 `main`(已 merge+push),`v1.1.2 / vc25`,`npm run check` 全綠。app 純 JS 跟 vc25 build 走;admin cron 已部署。

### ⚠️ 待老闆決策(擋 task #8 品牌三層識別)
**永久星圖 vs 每日輪換雜湊種子的匿名設計正面衝突。** `identity.ts` 目前刻意每日換 seed 且 SHA-256 雜湊,就是要讓人**無法跨日連結同一使用者**(資安稽核 H5)。交接包的「不換星圖」要的正是**跨夜可辨識**。我已加 `sigil` 欄位但**僅本機、未廣播**;要不要廣播(=別人跨夜認得你)是隱私取捨,需老闆拍板再動。
