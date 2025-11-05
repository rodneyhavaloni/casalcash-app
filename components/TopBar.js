import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing } from './theme';

export default function TopBar({ title, right }) {
  return (
    <View style={{
      backgroundColor: colors.green,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_700Bold', fontSize: 22, marginTop: spacing.lg }}>{title}</Text>
        {right ? <View style={{ marginTop: spacing.lg }}>{right}</View> : null}
      </View>
    </View>
  );
}
