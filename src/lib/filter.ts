// On-device content filter for abusive language
// No data leaves the device — all processing is local

// Only direct attacks on\u53e6\u4e00\u500b\u4eba are blocked. Self-expression \u2014 including talk of
// one's own pain or self-harm \u2014 must NEVER be filtered here: this app exists so
// those words can be said. (Safety screen offers the hotline for that instead.)
const BLOCKED_PATTERNS_ZH = [
  /\u5e79\u4f60/, /\u64cd\u4f60/, /\u5a4a\u5b50/,
  // \u300c\u53bb\u6b7b\u300d\u53ea\u64cb\u6307\u5411\u4ed6\u4eba\u7684\u7528\u6cd5\u2014\u2014\u300c\u6211\u597d\u60f3\u53bb\u6b7b\u300d\u662f\u9019\u500b app \u8981\u63a5\u4f4f\u7684\u8a71,\u4e0d\u662f\u653b\u64ca\u3002
  /[\u4f60\u59b3]\u53bb\u6b7b/, /\u53bb\u6b7b\u5427/, /\u6bba\u4e86\u4f60/, /\u6bba\u6389/,
  /\u5f37\u59e6/, /\u8f2a\u59e6/,
];

// Attacks on the other person only. "kill myself" / "kill me" — and a bare
// venting "fuck" — are SELF-expression, the very words this app exists to let
// people say; they must never be blocked (the Chinese list already dropped
// self-harm terms for the same reason). "kill yourself" / "kys" are directed
// at someone else: attacks.
const BLOCKED_PATTERNS_EN = [
  /\bf+u+c+k\s*(you|off)\b/i,
  /\bkill\s*your\s*self\b/i,
  /\bkill\s*you\b/i,
  /\brape\b/i,
  /\bkys\b/i,
  /\bn+i+g+[aeg]+r?\b/i,
  /\bs+l+u+t\b/i,
  /\bwh+ore\b/i,
];

const ALL_PATTERNS = [...BLOCKED_PATTERNS_ZH, ...BLOCKED_PATTERNS_EN];

export interface FilterResult {
  blocked: boolean;
  reason?: string;
}

export function filterMessage(text: string): FilterResult {
  const trimmed = text.trim();
  if (!trimmed) return { blocked: false };

  for (const pattern of ALL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { blocked: true, reason: 'abusive_language' };
    }
  }

  return { blocked: false };
}

export function sanitizeMessage(text: string): string {
  let result = text;
  for (const pattern of ALL_PATTERNS) {
    result = result.replace(pattern, (match) => '\u2588'.repeat(match.length));
  }
  return result;
}
