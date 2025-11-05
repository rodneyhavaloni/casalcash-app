import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../components/theme';
import TopBar from '../components/TopBar';

export default function CreateChooserScreen({ navigation }) {
  const Tile = ({ label, icon, color, ripple, onPress, subtitle }) => (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: ripple }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed, hovered }) => ([
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          paddingVertical: 18,
          paddingHorizontal: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: '#EEF2F7',
          flexDirection: 'row',
          alignItems: 'center',
        },
        hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }], elevation: 3 },
        pressed && {
          transform: [{ scale: 0.98 }, { translateY: 1 }],
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3,
        },
      ])}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Ionicons name={icon} size={22} color={'#fff'} />
      </View>
      <View style={{ marginLeft: 14, flex: 1 }}>
        <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold', fontSize: 16 }}>{label}</Text>
        {subtitle ? (
          <Text style={{ color: '#6B7280', fontFamily: 'Poppins_400Regular', marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={'#9CA3AF'} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title="Cadastrar" />
      <View style={{ padding: spacing.lg }}>
        <Text style={{ color: colors.text, fontFamily: 'Poppins_700Bold', fontSize: 20, marginBottom: spacing.md }}>
          O que você quer criar?
        </Text>

        <Tile
          label="Despesa"
          subtitle="Adicionar um novo lançamento"
          icon="card-outline"
          color={colors.salmon}
          ripple="#FECACA"
          onPress={() => navigation.navigate('AddItem')}
        />

        <Tile
          label="Meta"
          subtitle="Definir um objetivo de economia"
          icon="trophy"
          color={colors.green}
          ripple="#BBF7D0"
          onPress={() => navigation.navigate('CreateGoals')}
        />

        <Tile
          label="Categoria"
          subtitle="Organizar seus gastos por categorias"
          icon="pricetag-outline"
          color={'#60A5FA'}
          ripple="#BFDBFE"
          onPress={() => navigation.navigate('CreateCategory')}
        />
      </View>
    </View>
  );
}
