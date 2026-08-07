import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { SUPPORT } from '../lib/crisis';

// 只依賴實際用到的色盤欄位，好讓一般色盤（DIRECTIONS）與夜閣色盤
// （LOFT_PALETTE）都能直接傳入，不必是完整的 Palette 型別。
type CardPalette = {
  ink: string;
  muted: string;
  accent: string;
  glass: string;
  line: string;
};

/**
 * 溫柔浮現的求助卡片。可關閉、不阻擋任何操作。
 * 號碼可點擊直撥（危機當下少一道摩擦）。三個吐露點共用同一份文案。
 */
export function CrisisSupportCard({
  p,
  lang,
  onDismiss,
}: {
  p: CardPalette;
  lang: string;
  onDismiss: () => void;
}) {
  const en = lang === 'en';
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingHorizontal: 28,
        backgroundColor: 'rgba(0,0,0,0.4)',
      }}>
      <View
        style={{
          backgroundColor: p.glass,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: p.line,
          padding: 24,
        }}>
        <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 17, color: p.ink, textAlign: 'center', marginBottom: 12 }}>
          {en ? SUPPORT.titleEn : SUPPORT.titleZh}
        </Text>
        <Text style={{ fontFamily: 'NotoSerifTC-Light', fontSize: 14, lineHeight: 22, color: p.muted, textAlign: 'center', marginBottom: 14 }}>
          {en ? SUPPORT.bodyEn : SUPPORT.bodyZh}
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openURL(`tel:${SUPPORT.lineNumber}`).catch(() => {})}
          style={{ alignItems: 'center', marginBottom: 16 }}
          accessibilityRole="button"
          accessibilityLabel={en ? `Call ${SUPPORT.lineNumber}` : `撥打 ${SUPPORT.lineNumber}`}>
          <Text style={{ fontFamily: 'Inter-Regular', fontSize: 34, fontWeight: '700', color: p.accent, textAlign: 'center' }}>
            {SUPPORT.lineNumber}
          </Text>
          <Text style={{ fontFamily: 'NotoSerifTC-Light', fontSize: 12, color: p.muted, marginTop: 2 }}>
            {en ? 'Tap to call · free' : '點一下撥打 · 免付費'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.ink }}>
            {en ? SUPPORT.dismissEn : SUPPORT.dismissZh}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
