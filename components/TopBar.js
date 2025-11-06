import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing } from './theme';

// TopBar padrão com opções de customização
// Props:
// - title: string
// - subtitle?: string
// - left?: ReactNode (ex: botão voltar)
// - right?: ReactNode (ex: ações)
// - backgroundColor?: string (padrão: colors.green)
// - rounded?: boolean (padrão: true)
// - radius?: number (padrão: 16)
// - titleColor?: string (padrão: #fff)
// - subtitleColor?: string (padrão: rgba branco 0.85)
// - titleSize?: number (padrão: 22)
// - centerTitle?: boolean (padrão: false)
// - style?: ViewStyle (estilo adicional do container)
export default function TopBar({
  title,
  subtitle,
  left,
  right,
  backgroundColor = colors.green,
  rounded = true,
  radius = 16,
  titleColor = '#FFFFFF',
  subtitleColor = 'rgba(255,255,255,0.85)',
  titleSize = 22,
  centerTitle = false,
  style,
}) {
  return (
    <View
      style={{
        backgroundColor,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: rounded ? radius : 0,
        borderBottomRightRadius: rounded ? radius : 0,
        ...style,
      }}
    >
      {/* Layout com 3 áreas: esquerda (48), centro (flex), direita (48) */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 48, justifyContent: 'center', marginTop: spacing.lg }}>
          {left || null}
        </View>
        <View style={{ flex: 1, alignItems: centerTitle ? 'center' : 'flex-start', marginTop: spacing.lg }}>
          {title ? (
            <Text style={{ color: titleColor, fontFamily: 'Poppins_700Bold', fontSize: titleSize }}>{title}</Text>
          ) : null}
          {subtitle ? (
            <Text style={{ color: subtitleColor, fontFamily: 'Poppins_400Regular', marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={{ width: 48, alignItems: 'flex-end', justifyContent: 'center', marginTop: spacing.lg }}>
          {right || null}
        </View>
      </View>
    </View>
  );
}
