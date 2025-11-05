import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Pressable, Platform } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { supabase } from '../services/supabaseClient';
import Button from '../components/Button';
import Input from '../components/Input';
import TopBar from '../components/TopBar';
import { colors, spacing } from '../components/theme';
import { Ionicons } from '@expo/vector-icons';

export default function CreateCategoryScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('pricetag-outline');
  const [selectedColor, setSelectedColor] = useState('#60A5FA');

  // Animations
  const enter = useSharedValue(0);
  const card = useSharedValue(0);
  const i1 = useSharedValue(0);
  const i2 = useSharedValue(0);

  const contentAnim = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ translateY: (1 - enter.value) * 8 }] }));
  const cardAnim = useAnimatedStyle(() => ({
    opacity: card.value,
    transform: [
      { translateY: (1 - card.value) * 10 },
      { scale: 0.98 + card.value * 0.02 },
    ],
  }));
  const item1 = useAnimatedStyle(() => ({ opacity: i1.value, transform: [{ translateY: (1 - i1.value) * 8 }] }));
  const item2 = useAnimatedStyle(() => ({ opacity: i2.value, transform: [{ translateY: (1 - i2.value) * 8 }] }));

  useEffect(() => {
    enter.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    card.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    i1.value = withDelay(120, withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
    i2.value = withDelay(200, withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, []);

  const nomeError = attempted && !nome.trim() ? 'Obrigatório' : undefined;

  const handleSave = async () => {
    if (!nome.trim()) { setAttempted(true); return; }
    setAttempted(false);
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      const createdBy = user?.email || user?.id || null;
      // Base: Categoria (com fallback para categoria)
      let ins = await supabase.from('Categoria').insert({ nome: nome.trim(), created_by: createdBy, cor: selectedColor, icone: selectedIcon }).select('id');
      if (ins.error) {
        ins = await supabase.from('categoria').insert({ nome: nome.trim(), created_by: createdBy, cor: selectedColor, icone: selectedIcon }).select('id');
      }
      if (ins.error) throw ins.error;
      Alert.alert('Categoria criada', 'Sua categoria foi criada com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erro ao salvar', e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title="Nova Categoria" />
      <Animated.ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing.md, alignItems: 'center', justifyContent: 'flex-start', flexGrow: 1 }}
        style={contentAnim}
      >
        <Animated.View style={[{
          marginTop: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#EEF2F7',
          padding: spacing.md,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
          width: '100%',
          maxWidth: 720,
        }, cardAnim]}>
          <Animated.View style={item1}>
            <Input
              label="Nome"
              value={nome}
              onChangeText={setNome}
              placeholder="Ex.: Alimentação, Lazer, Transporte…"
              error={nomeError}
            />
          </Animated.View>

          {/* Ícone */}
          <Animated.View style={item1}>
            <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium', marginBottom: 8 }}>Ícone</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['pricetag-outline','fast-food-outline','home-outline','car-outline','happy-outline','medkit-outline','school-outline','play-circle-outline','cash-outline','shirt-outline','wallet-outline','calendar-outline','cafe-outline','airplane-outline'].map((icon) => (
                <Pressable
                  key={icon}
                  onPress={() => setSelectedIcon(icon)}
                  android_ripple={{ color: '#E5E7EB' }}
                  style={({ pressed, hovered }) => ([
                    {
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selectedIcon === icon ? colors.green : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: selectedIcon === icon ? colors.green : '#E5E7EB',
                      marginRight: 8,
                      marginBottom: 8,
                    },
                    hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }], elevation: 2 },
                    pressed && { transform: [{ scale: 0.97 }], opacity: 0.96 },
                  ])}
                >
                  <Ionicons name={icon} size={20} color={selectedIcon === icon ? '#FFFFFF' : '#111827'} />
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Cor */}
          <Animated.View style={item1}>
            <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium', marginBottom: 8 }}>Cor</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['#60A5FA','#F59E0B','#10B981','#EF4444','#8B5CF6','#F472B6','#22D3EE','#A3E635','#F97316','#14B8A6'].map((c) => (
                <View key={c} style={{ marginRight: 8, marginBottom: 8 }}>
                  <Button
                    label=""
                    onPress={() => setSelectedColor(c)}
                    style={{
                      backgroundColor: c,
                      borderWidth: selectedColor === c ? 2 : 1,
                      borderColor: selectedColor === c ? '#111827' : '#E5E7EB',
                      width: 36, height: 36, borderRadius: 18, padding: 0,
                    }}
                    textStyle={{ display: 'none' }}
                  />
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={item2}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button label="Cancelar" variant="secondary" onPress={() => navigation.goBack()} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={saving ? 'Salvando…' : 'Salvar'} variant="primary" onPress={handleSave} disabled={saving} />
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}
