// On-device content filter for abusive language
// No data leaves the device — all processing is local

const BLOCKED_PATTERNS_ZH = [
  /\u5e79\u4f60/, /\u64cd\u4f60/, /\u5a4a\u5b50/, /\u767d\u7601/, /\u5ee2\u7269/,
  /\u53bb\u6b7b/, /\u6bba\u4e86\u4f60/, /\u6bba\u6389/,
  /\u5f37\u59e6/, /\u8f2a\u59e6/,
  /\u81ea\u6bba/, /\u5272\u8173/,
];

const BLOCKED_PATTERNS_EN = [
  /\bf+u+c+k\s*(you|off|ing)?\b/i,
  /\bkill\s*(your|my)?self\b/i,
  /\bkill\s*you\b/i,
  /\brape\b/i,
  /\bkys\b/i,
  /\bn+i+g+[aeg]+r?\b/i,
  /\bs+l+u+t\b/i,
  /\bwh+ore\b/i,
  /\bk+i+l+l\b.*\b(me|myself)\b/i,
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
