# 第卅者 (The Other) — Phased Implementation Plan

Generated from full codebase audit. Each phase lists specific file changes, dependency order, and decisions needed.

---

## PHASE 0: Foundation Fixes (Gender Pipeline + Data Integrity)
**Priority: CRITICAL — everything downstream depends on this**

### 0A. Add gender to AppState
**File:** `src/hooks/useAppStore.ts`

- Add `gender: string | null` to `AppState` interface (line 20)
- Initialize `_state.gender = null` (line 42)
- Read `gender` from AsyncStorage in `initStore()`
- Add `setGender(g: string)` function (mirrors `setLang` pattern — persist to AsyncStorage, sync to Firestore via `updateUser`)
- On `_syncWithFirebase`, pull `dbUser.gender` into `_state`

### 0B. Save setup profile fields to Firestore
**File:** `src/screens/SetupScreen.tsx`

- `handleDone` currently only calls `setSetupDone()`. Change to:
  1. Map client gender values (`'f'`→`'female'`, `'m'`→`'male'`, `'x'`→`'nonbinary'`) to Supabase/Firestore values
  2. Call `updateUser({ gender, ageBracket, relationshipStatus, seeking, boundary, region, quote })` before `setSetupDone()`
  3. Call `setGender(gender)` to push to AppState
- Also needs `import { updateUser } from '../lib/db'`

**Decision needed:** The `ageBracket` chip options use en-dashes (`'25−30'`) but Supabase expects `'25-29'`, `'30-34'`, etc. Must map:
  - `'25−30'` → `'25-29'` (client shows range, DB stores bracket start)
  - `'31−35'` → `'30-34'`
  - `'36−40'` → `'35-39'`
  - `'41−45'` → `'40-44'`
  - `'46+'` → `'45+'`

Same for `relationshipStatus` — client values (Chinese or English chips) need mapping to Supabase enum values. Build a mapping table.

**Decision needed:** `seeking` chip values differ between zh/en and Supabase enums. Client chips: `['一個樹洞', '情感陪伴', '曖昧', '線上親密', '不設限']`. Supabase expects: `['listen', 'vent', 'connect', 'loft']`. Need a bidirectional mapping.

### 0C. Non-binary role selection
**File:** `src/screens/SetupScreen.tsx`

When gender `'x'` is selected, show a sub-selector for "Loft role":
- Options: "進入時當傾聽者" / "進入時當傾訴者" / "今晚再說"
- Store as `loft_role: 'listener' | 'speaker' | 'undecided'` (new field on DbUser)
- This controls gender-based pricing: women free, men 5 wicks, non-binary chooses

### 0D. Display saved data in ProfileScreen
**File:** `src/screens/ProfileScreen.tsx`

- Read `gender`, `ageBracket`, `relationshipStatus`, `seeking`, `boundary`, `region`, `quote` from AppState (requires Phase 0A gender in AppState, plus extending AppState with the other fields or reading from DB)
- Replace hardcoded `DIARY`, `interests`, quote, and status chip with actual user data
- Show `relationshipStatus` instead of hardcoded `"married · 12 yrs"`
- Show user's `quote` instead of hardcoded marriage quote
- Show user's `seeking` chips instead of hardcoded interests
- For `interests`: derive from `seeking` labels, or remove if not collected

### 0E. Gender-pricing enforcement in LoftScreen
**File:** `src/screens/LoftScreen.tsx`

- Read `gender` from AppState
- Enforce pricing: `gender === 'f'` → free entry (bypass `enterLoft` wick spend or call with 0 cost), `gender === 'm'` → 5 wicks, `gender === 'x'` → check `loft_role` field
- Modify `enterLoft()` in `src/lib/db.ts` to accept an optional `overrideCost` parameter, or handle it client-side before calling

### 0F. Fix gendered Chinese pronouns in copy
**Files:** `src/lib/copy.ts`, inline strings in screens

- `moodPlaceholder`: `'最近和他⋯⋯'` → `'最近和那個人⋯⋯'` (gender-neutral)
- `loftGift`: `'送出一根燭·謝謝他'` → `'送出一根燭·謝謝對方'`
- `matchSubhead`: `'他寫的是：'` → `'對方寫的是：'`
- `ProfileScreen` DIARY: `'他睡了。我在陽台站了很久。'` → keep as is (diary is user-authored, can be gendered)
- Audit all zh strings for 他/她 gendered pronouns; use 對方/那個人/對方 as neutral alternatives

---

## PHASE 1: IAP / Payment Integration
**Priority: CRITICAL — App Store rejection without real payments**

### 1A. Install expo-in-app-purchases
**File:** `package.json`

```bash
npx expo install expo-in-app-purchases
```

**Decision needed:** Expo SDK 56 — verify `expo-in-app-purchases` compatibility. If not available for SDK 56, consider `react-native-iap` (but this requires config plugin and may not work with Expo managed workflow). Check Expo docs at https://docs.expo.dev/versions/v56.0.0/.

**Alternative:** If IAP library doesn't support SDK 56, use Expo Config Plugin with `react-native-iap` or defer to Expo's new `expo-purchases` (RevenueCat wrapper) if available.

### 1B. Create IAP service module
**New file:** `src/lib/iap.ts`

```
- initializeConnection() — call at app startup
- getAvailableProducts() — fetch wick packs + vigil subscription
- purchaseWickPack(packId) — handles purchase flow, on success calls addWicks()
- purchaseVigilSubscription() — handles subscription, on success calls setVigil(true) + writes to Supabase vigil_subscriptions
- restorePurchases() — restore on app launch / from settings
- acknowledgePurchase() — Android only
- listenForPurchaseUpdates() — event listener for pending purchases
```

**Product IDs (need to create in App Store Connect):**
- `com.thirties.social.wick10` — 10 wicks, NT$49
- `com.thirties.social.wick30` — 30 wicks, NT$129
- `com.thirties.social.wick100` — 100 wicks, NT$349
- `com.thirties.social.vigil.monthly` — Vigil subscription, NT$168/mo

### 1C. Wire UpgradeScreen to IAP
**File:** `src/screens/UpgradeScreen.tsx`

- Replace `handleBuyPack` to call IAP purchase instead of direct `addWicks()`
- Replace `handleVigil` to initiate subscription purchase
- Add purchase status loading states
- Add "Restore purchases" button at bottom
- Handle purchase errors gracefully (network, already owned, etc.)

### 1D. Vigil subscription management
**File:** `src/lib/db.ts`

- Add `createVigilSubscription(userId, paymentRef, amount)` — writes to Firestore `vigil_subscriptions` collection (need to create this collection in Firestore rules)
- Add `checkVigilStatus(userId)` — checks if subscription is active and not expired
- On app startup in `_syncWithFirebase`, check `vigil_subscriptions` for active subscription

**Supabase consideration:** The `vigil_subscriptions` table already exists in Supabase. Decision: continue with Firebase-only, or start migrating to Supabase for subscription data? Recommendation: keep Firebase for now (less risk), migrate later.

### 1E. Receipt validation (server-side)
**Decision needed:** App Store requires server-side receipt validation for subscriptions. Options:
1. Firebase Cloud Function to validate receipts with Apple/Google
2. Use RevenueCat server-side (adds cost but handles validation)
3. Deferred — Apple may accept initial submission without server-side validation if the app clearly indicates subscription status

Recommendation: Implement basic client-side validation first, add Cloud Function before full launch.

---

## PHASE 2: App Store Compliance
**Priority: CRITICAL — required for submission**

### 2A. Account deletion
**File:** `src/screens/SettingsScreen.tsx`

The delete handler is `onPress: () => {}` (line 170). Implement:

1. Create `deleteAccount()` in `src/lib/db.ts`:
   - Delete user doc from Firestore `users/{uid}`
   - Delete all `wicksTransactions` where userId matches
   - Delete from `matchQueue`
   - Delete from `rooms` (or leave as anonymous)
   - Sign out Firebase anonymous auth
   - Clear AsyncStorage
   - Reset AppState to defaults
2. Wire into the Alert handler
3. After deletion, navigate to Onboarding

**App Store requirement:** Must provide account deletion AND data export. Data export can be a future addition.

### 2B. Privacy Policy
**Decision needed:** App Store requires a privacy policy URL.

Options:
1. Create a simple static page (GitHub Pages, Vercel, or Cloudflare Pages)
2. Host at `https://thirties.social/privacy`
3. Content must cover: what data is collected (device ID, gender, age, messages), how it's used, that messages are ephemeral, that anonymous auth is used

### 2C. Fill eas.json submit credentials
**File:** `eas.json`

Fill in:
- `appleId`: Apple Developer account email
- `ascAppId`: App Store Connect App ID
- `appleTeamId`: Apple Developer Team ID

These are needed for `eas submit` to work.

### 2D. App Store metadata
- Privacy policy URL in app.json
- App category (Social Networking or Lifestyle)
- Age rating (17+ for emotional content)
- Screenshots for all device sizes
- App description in zh and en

---

## PHASE 3: MatchQueue → Real Matching
**Priority: HIGH — core loop is demo-only**

### 3A. Wire MatchScreen to real data
**File:** `src/screens/MatchScreen.tsx`

Currently uses `DEMO_SEED` and `DEMO_MOOD`. Changes:

1. After MoodScreen, call `joinMatchQueue({ moodText })` (function already exists in db.ts)
2. Poll or subscribe to `matchQueue` for a match
3. When matched, navigate to `MatchScreen` with real `fromSeed` and `moodText` from the matched user
4. Remove `DEMO_SEED` and `DEMO_MOOD` constants

### 3B. Matching logic
**New file:** `src/lib/matching.ts`

Implement matching algorithm:
1. Query `matchQueue` for other waiting users (exclude self)
2. Prefer users with compatible `seeking` preferences
3. Consider `gender` preferences (if any matching rules defined)
4. Create a `conversation` document linking the two users
5. Remove both from `matchQueue`
6. Navigate to `MatchScreen` with matched user's seed and mood

**Decision needed:** How sophisticated should matching be? Options:
- Simple FIFO: first-in-first-out pairing (easiest)
- Preference-based: match seeking types (listen↔listen, etc.)
- Gender-aware: women can see all, men need wicks (extend Loft pricing to matching?)

### 3C. Room → Conversation flow
**File:** `src/screens/RoomScreen.tsx`

The room invite flow creates conversations via `createConversation()`. Wire this to:
1. Create conversation with proper `expiresAt` (30 min)
2. Navigate to `ChatScreen` with the new `conversationId`
3. Both users get notified

### 3D. Real-time match subscription
**File:** `src/screens/MoodScreen.tsx`

After entering mood and joining queue:
1. Show "waiting" state with countdown (30 min expiry)
2. Subscribe to own `matchQueue` doc for changes
3. When matched (doc deleted or status changed), navigate to Match
4. Show "no match found" after timeout

---

## PHASE 4: Loft Chat with Real Messages
**Priority: HIGH — Loft is the monetization centerpiece**

### 4A. LoftChat Firestore integration
**File:** `src/screens/LoftChatScreen.tsx`

Currently all messages are local state (`MESSAGES` constant + `localMessages`). Changes:

1. Create `loft_conversations` subcollection under `loftSessions` (or use the existing Firestore schema)
2. Send messages via `addDoc(collection(db, 'loftSessions', sessionId, 'messages'), ...)`
3. Subscribe via `onSnapshot` for real-time updates
4. Remove hardcoded `MESSAGES` array
5. Remove hardcoded `"wine, long-bench"` header — derive from other user's seed

### 4B. Loft session pairing
**File:** `src/screens/LoftScreen.tsx`

Currently `fetchTonightLoftSessions()` returns all tonight's sessions. Need to:
1. Pair loft entrants (algorithm TBD — random, preference-based, or sequential)
2. Create a loft conversation between the pair
3. Navigate to `LoftChatScreen` with the paired session
4. If no pair available, show "waiting" state

### 4C. Loft photo veil with real images
**File:** `src/screens/LoftChatScreen.tsx`, `src/components/ui/index.tsx`

- `PhotoVeil` component currently renders a gradient placeholder
- Need image picker integration (`expo-image-picker`)
- Upload photo to Firebase Storage (or Supabase Storage)
- Store photo URL in the conversation/session
- Apply veil layers as blur filters on the image

### 4D. Loft rules enforcement
- One entry per night (already enforced in `enterLoft()`)
- 58-minute session timer (hardcoded to 58:14 in LoftChatScreen — derive from actual session timestamp)
- Women free entry (Phase 0E covers pricing)
- Vigil members get free Loft access (check `vigil` flag)

---

## PHASE 5: Safety & Moderation
**Priority: HIGH — required for App Store and user trust**

### 5A. Report/block functionality
**File:** `src/screens/SafetyScreen.tsx`

Currently all three buttons navigate to `Close` without calling `fileReport`. Changes:

1. Pass `conversationId` and `reportedUserId` as route params to SafetyScreen
2. "Block and disappear": call `fileReport({ reportType: 'block', ... })` then navigate to Close
3. "Report": call `fileReport({ reportType: 'report', ... })` then navigate to Close
4. "Leave quietly": just navigate to Close (no report)

**File:** `src/screens/ChatScreen.tsx`
- Add a "..." or shield button that navigates to Safety with params

### 5B. Content auto-filter
**File:** `src/screens/SettingsScreen.tsx`

The `autoFilter` toggle is decorative. Implement:
1. Create `src/lib/filter.ts` with a keyword/pattern list
2. Apply filter to sent messages in `sendConversationMessage()`
3. Optionally warn user before sending flagged content
4. Persist the setting in AppState + Firestore

### 5C. Screenshot protection
Already has `expo-screen-capture` prevention via watermarks. Verify:
- `expo-screen-capture` is installed (check package.json — it's NOT)
- Install and configure for ChatScreen and LoftChatScreen
- Show `noShot` toast when screenshot attempted

---

## PHASE 6: UI/UX Improvements
**Priority: MEDIUM — polish for retention**

### 6A. CloseScreen real stats
**File:** `src/screens/CloseScreen.tsx`

Stats are hardcoded to `1, 1, 0`. Track:
- `conversationsStarted` count (increment in `createConversation`)
- `peopleSpokenTo` count (unique userBIds)
- `stored` always 0 (by design)

Store daily counters in Firestore user doc or a separate `dailyStats` collection.

### 6B. Settings persistence
**File:** `src/screens/SettingsScreen.tsx`

- `autoFilter` and `slowMode` are local state only → persist to Firestore + AsyncStorage
- "Visibility level" bars → make functional (controls how blurred identity appears to others)
- "Daily quiet limit" → currently shows hardcoded "3", make configurable (Vigil gets more?)

### 6C. ChatScreen improvements
**File:** `src/screens/ChatScreen.tsx`

- Remove hardcoded `INITIAL_MESSAGES` — start with empty state when no conversationId
- Remove hardcoded `TOTAL_SECONDS` — derive from conversation's `expiresAt`
- Remove hardcoded watermark open time "23:47"
- Add message send throttle (slow mode from settings)

### 6D. Photo veil image picker
**File:** `src/screens/LoftChatScreen.tsx`

- Add `expo-image-picker` integration
- User selects photo → applies 4-level blur → uploads to storage
- Partner lifts veils progressively

### 6E. Onboarding polish
- Consider adding gender-aware copy in onboarding
- Add privacy policy link in onboarding flow

---

## PHASE 7: Business Model & Analytics
**Priority: MEDIUM — needed for sustainability**

### 7A. Economy tracking
**File:** `src/lib/db.ts`

The `wicksTransactions` collection already tracks all wick movements. Add:
- Dashboard view (already in Supabase admin views, but not in Firebase)
- Aggregate queries for DAU, wick economy health
- Consider mirroring key data to Supabase for admin tooling

### 7B. Vigil tier value
Current Vigil benefits (NT$168/mo):
- Unlimited conversations
- All identity types
- Loft access (no wick cost)
- Photo veils included
- 2x daily wicks (already implemented in `claimDailyReward`)

Verify all benefits are enforced:
- Unlimited conversations: currently no limit enforced on free tier either → add limit
- All identity types: currently all types available to everyone → gate behind Vigil
- Loft free: Phase 0E handles gender pricing, add Vigil bypass

### 7C. Daily limit enforcement
**File:** `src/hooks/useAppStore.ts` or `src/lib/db.ts`

- Free tier: 3 conversations per 24h cycle
- Vigil: unlimited
- Track `conversationsToday` counter, reset at 03:00
- Block match queue entry when limit reached

### 7D. A/B testing framework
Consider adding feature flags for:
- Pricing experiments
- Matching algorithm variants
- UI copy variants

---

## PHASE 8: Supabase Migration (Future)
**Priority: LOW — deferred, current Firebase works**

The Supabase schema is significantly more complete than the Firebase implementation. Consider migrating:
- RLS policies for security
- Database functions for atomic operations (spend_wicks, enter_loft, etc.)
- pg_cron for seed rotation and data cleanup
- Admin views for dashboard

This is a large migration and should only be attempted after the Firebase-based app is stable and in the App Store.

---

## Dependency Graph

```
Phase 0 (Foundation)
  └── Phase 1 (IAP) — can start in parallel with 0C-0F
  └── Phase 3 (Matching) — needs 0A for gender-aware matching
  └── Phase 4 (Loft) — needs 0E for gender pricing

Phase 2 (Compliance) — can start in parallel with everything
  └── Needs 1A-1C for real payments

Phase 5 (Safety) — can start after Phase 3
  └── Needs real conversations to report

Phase 6 (UX) — after Phases 0, 3, 4
  └── Polishes existing flows

Phase 7 (Business) — after Phases 1, 3, 4
  └── Needs real economy data

Phase 8 (Supabase) — after Phase 7, if desired
```

## Decisions Needed (Summary)

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | IAP library for SDK 56 | expo-in-app-purchases vs react-native-iap vs RevenueCat | Check SDK 56 compat first |
| 2 | Server-side receipt validation | Firebase Cloud Function vs RevenueCat vs deferred | Basic client now, Cloud Function before full launch |
| 3 | Matching algorithm | FIFO vs preference-based vs gender-aware | Preference-based (seeking tags) |
| 4 | Non-binary Loft role | listener/speaker/undecided | All three options |
| 5 | Privacy policy hosting | GitHub Pages vs Vercel vs Cloudflare Pages | Cloudflare Pages (free, fast) |
| 6 | Supabase migration timing | Now vs after App Store launch | After launch |
| 7 | Free tier conversation limit | Enforce 3/day or leave unlimited | Enforce 3/day (drives Vigil conversion) |
| 8 | Identity gating behind Vigil | All types free vs premium types gated | Gate character + silhouette behind Vigil |

---

## File Change Summary by Phase

### Phase 0 (8 files)
- `src/hooks/useAppStore.ts` — gender in AppState + setGender
- `src/screens/SetupScreen.tsx` — save all fields to DB + non-binary role
- `src/screens/ProfileScreen.tsx` — display real user data
- `src/screens/LoftScreen.tsx` — gender pricing
- `src/lib/db.ts` — updateUser calls, enterLoft cost override
- `src/lib/copy.ts` — gender-neutral pronouns
- `src/lib/identity.ts` — (if gender affects identity generation)

### Phase 1 (5 files)
- `package.json` — install IAP library
- `src/lib/iap.ts` — new IAP service module
- `src/screens/UpgradeScreen.tsx` — wire to real purchases
- `src/hooks/useAppStore.ts` — purchase state
- `src/lib/db.ts` — subscription management

### Phase 2 (4 files)
- `src/screens/SettingsScreen.tsx` — account deletion
- `src/lib/db.ts` — deleteAccount function
- `eas.json` — submit credentials
- `app.json` — privacy policy URL, metadata

### Phase 3 (5 files)
- `src/screens/MatchScreen.tsx` — real match data
- `src/screens/MoodScreen.tsx` — queue subscription
- `src/lib/matching.ts` — new matching logic
- `src/lib/db.ts` — match queue operations
- `src/screens/RoomScreen.tsx` — conversation creation

### Phase 4 (4 files)
- `src/screens/LoftChatScreen.tsx` — Firestore messages
- `src/screens/LoftScreen.tsx` — session pairing
- `src/components/ui/index.tsx` — PhotoVeil with real images
- `src/lib/db.ts` — loft conversation CRUD

### Phase 5 (3 files)
- `src/screens/SafetyScreen.tsx` — real report/block
- `src/screens/ChatScreen.tsx` — safety navigation
- `src/lib/filter.ts` — new content filter module

### Phase 6 (5 files)
- `src/screens/CloseScreen.tsx` — real stats
- `src/screens/SettingsScreen.tsx` — persist settings
- `src/screens/ChatScreen.tsx` — remove hardcoded data
- `src/components/ui/PhotoVeil.tsx` — image picker
- `src/screens/OnboardingScreen.tsx` — privacy link
