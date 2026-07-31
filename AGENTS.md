# 產品鐵律（PRODUCT MANDATE — 動任何程式碼前必讀）

燭影私語 / Candle Whisper 是**匿名情緒陪伴空間**。以下是不可違反的定位，任何改動都必須守住：

1. **陪伴，不是約會（NOT a dating app）。** 北極星是「每晚想打開的陪伴空間」。
   核心賣點是**情緒出口／宣洩／被聽見**，不是「配對交友」「遇見一個人」「脫單」。
   - ✅ 用「說出口」「靜靜說說話」「今晚想被聽見」這類語氣。
   - ❌ 不要用「約會」「遇見對的人」「幫你找一個人」「dating / match-making」這類框架，
     即使底層有 1 對 1 配對機制，**文案與敘事也絕不能約會化**。
2. **不做任何 AI 功能。** 使用者已拍板：app 內不加入任何 AI（不論生成、推薦、聊天機器人）。
   冷啟動靠真人機制（陪聊值班台），不是 AI。
3. **灰度語氣。** 不二分、不貼標籤、平等。所有文案／UX 都守這個調性。
4. **誠實優先。** 不要宣稱做不到的事（例：不能說「我們不會儲存對話」如果進行中其實會同步訊息）。
   隱私承諾必須與實際行為一致。

> 若某個需求看起來與以上衝突，**先停下來問使用者**，不要自行往約會／AI 方向詮釋。

---

# 工程不變量（ENGINEERING INVARIANTS — 改到相關區塊前必讀，改動後跑 `npm run check`）

這些是已通過安全審計的護欄，被 `scripts/*-regression.mjs` 守著。**不要放寬**；要動先確認回歸測試同步更新且仍合理。

## 經濟（燭芯 / 守夜會員）
- **發放只在伺服器端**：燭芯加值、vigil 開啟，**唯一**入口是 RevenueCat webhook（`thirties-admin` 的 `api/iap/revenuecat`）。客戶端永遠不能為自己加燭芯或開會員。
- 客戶端 wick ledger **只能扣（spend-only）**，餘額**不得為負**。
- 新帳號固定 **3 燭芯**、`vigil:false`、未封鎖起始值（`validNewUser()` 強制）。
- IAP 商品 ID 必須 app 端與 webhook 兩邊一致：`wick10/30/100` + `vigil.monthly`。

## 隱私 / 安全
- **發文/寫入必須有真實且未封鎖的 user profile**（不能靠刪 profile 繞過封鎖）。
- 照片在**上傳時就降析度**把匿名性烤進像素：帶紗照 140px、夜閣照 96px、一律去 EXIF/GPS。不要改大或延後降析度。
- 對話結束/過期 → 清訊息內容、拒收新訊息（一般對話、夜閣、房間都是）。
- 密鑰**不進版控**：Firebase 設定放 EAS env / 本地 .env；Cloudinary、RevenueCat 密鑰只在伺服器端。
- Firestore rules 是真正防線（客戶端不可信）。放寬 rules 前先過 `/security-review`。

## Build / 發布
- 動到**原生依賴**（`package.json` 的 `expo-*` / `react-native-*`）→ **必須重 build，不能 OTA**（OTA 到 production channel 會讓舊客戶端閃退）。純 JS 修復才可考慮 OTA，且要跟 build 走。
- 出 build 前跑 `/pre-build-check`。

---

# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.
