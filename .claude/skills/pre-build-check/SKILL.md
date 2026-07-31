---
name: pre-build-check
description: One-shot quality gate to run before every EAS build / release of 燭影私語. Runs the regression suite + voice-lint, reviews the diff for bugs and security holes, checks product-mandate compliance, and returns a clear GO / NO-GO. Use before `eas build`, before shipping to testers, or whenever asked "can we build / ship this?".
---

# pre-build-check — 出 build 前的品質關卡

出 build 給測試者/上架前跑這個。目標：**不讓已知問題進到測試者手裡**。逐步做完，最後給明確的 GO / NO-GO。

## 步驟（依序，任何一步紅燈就停下報告）

### 1. 自動化回歸 + 語氣 lint
```bash
npm run check
```
含 `typecheck` + identity/persona/time/security 回歸 + `lint:voice`。全綠才往下。

### 2. 看這次要出的 diff 有沒有 bug
對照上一個 release/commit，跑 `/code-review`（或 `代碼審查員` subagent）審這次改動的正確性。重點：經濟、配對、對話生命週期、金流 webhook。

### 3. 安全審查（此 app 必跑）
跑 `/security-review` 審 pending 改動。這是**匿名社交＋金流＋隱私**的 app，特別看：
- Firestore rules 有沒有被放寬（`firestore.rules`）
- 燭芯/vigil 發放是否仍只在伺服器端（RevenueCat webhook）
- 照片是否仍在上傳時降析度（帶紗 140px / 夜閣 96px）、去 EXIF
- 有沒有把密鑰寫進版控

### 4. 產品鐵律核對
確認沒有違反 `AGENTS.md`：陪伴非約會、不做 AI、灰度語氣、誠實承諾。`npm run lint:voice` 已涵蓋文案層；再人工掃一眼有沒有新增的約會/AI 流程。

### 5. Build 前設定確認
- `app.json` 的 `versionCode` 會被 EAS `autoIncrement` 處理，確認 profile 對（`production` = AAB 給 Play）
- 若動到**原生依賴**（`package.json` 的 expo-*/react-native-*）→ **必須重 build，不能 OTA**（OTA 會讓舊客戶端閃退）
- 金流要能端到端：Vercel `REVENUECAT_WEBHOOK_AUTH` 有設且與 RevenueCat 儀表板一致

## 產出

一段 **GO / NO-GO** 結論：
- 🟢 GO：以上全過，可 `eas build`
- 🔴 NO-GO：列出紅燈項目 + 修復建議，先修再 build

> 原則（見 `AGENTS.md`）：品質 > 速度。寧可晚一輪 build，不要讓壞東西到測試者手裡。
