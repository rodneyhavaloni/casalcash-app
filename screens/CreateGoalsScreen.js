import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, withDelay } from 'react-native-reanimated';
import { supabase } from '../services/supabaseClient';
import Input from '../components/Input';
import Button from '../components/Button';
import DatePickerField from '../components/DatePickerField';
import { colors, spacing } from '../components/theme';
import TopBar from '../components/TopBar';

export default function CreateGoalsScreen({ navigation }) {
  // Campos solicitados: nome, valor, data de realizaacao, descricao
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [dataRealizacao, setDataRealizacao] = useState(''); // DD-MM/YYYY na UI
  const [descricao, setDescricao] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Animations (enter + step + progress)
  const enter = useSharedValue(0);
  const cardAnimValue = useSharedValue(0);
  const i1 = useSharedValue(0);
  const i2 = useSharedValue(0);
  const i3 = useSharedValue(0);
  const i4 = useSharedValue(0);
  const i5 = useSharedValue(0);

  const contentAnim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 8 }],
  }));
  const cardAnim = useAnimatedStyle(() => ({
    opacity: cardAnimValue.value,
    transform: [
      { translateY: (1 - cardAnimValue.value) * 10 },
      { scale: 0.98 + cardAnimValue.value * 0.02 },
    ],
  }));
  const item1Anim = useAnimatedStyle(() => ({ opacity: i1.value, transform: [{ translateY: (1 - i1.value) * 8 }] }));
  const item2Anim = useAnimatedStyle(() => ({ opacity: i2.value, transform: [{ translateY: (1 - i2.value) * 8 }] }));
  const item3Anim = useAnimatedStyle(() => ({ opacity: i3.value, transform: [{ translateY: (1 - i3.value) * 8 }] }));
  const item4Anim = useAnimatedStyle(() => ({ opacity: i4.value, transform: [{ translateY: (1 - i4.value) * 8 }] }));
  const item5Anim = useAnimatedStyle(() => ({ opacity: i5.value, transform: [{ translateY: (1 - i5.value) * 8 }] }));

  // Helpers de data
  const toISOFromDDMMYYYY = (s = '') => {
    const m = String(s).match(/^(\d{2})-(\d{2})\/(\d{4})$/);
    if (!m) return s;
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  };
  const parseDDMMYYYYToDate = (s = '') => {
    const m = String(s).match(/^(\d{2})-(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const [, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  };

  useEffect(() => {
    // animação inicial
    enter.value = 0;
    enter.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    cardAnimValue.value = 0;
    cardAnimValue.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    // stagger dos campos
    i1.value = withDelay(80, withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
    i2.value = withDelay(140, withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
    i3.value = withDelay(200, withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
    i4.value = withDelay(260, withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
    i5.value = withDelay(320, withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, []);

  // Validações simples
  const valorNum = Number(String(valor || '').replace(',', '.'));
  const nomeError = attempted && !nome.trim() ? 'Obrigatório' : undefined;
  const valorError = attempted && !(valorNum > 0) ? 'Informe um valor válido' : undefined;
  const dataError = attempted && !(String(dataRealizacao).length >= 10) ? 'Informe a data de realização' : undefined;

  const onSave = async () => {
    if (!nome.trim() || !(valorNum > 0) || !(String(dataRealizacao).length >= 10)) {
      setAttempted(true);
      Alert.alert('Atenção', 'Preencha Nome, Valor e Data de realização.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        nome,
        valor: valorNum,
        ['data de realizaacao']: toISOFromDDMMYYYY(dataRealizacao),
        descricao: descricao || null,
      };
      const ins = await supabase.from('metas').insert(payload).select('id');
      if (ins.error) throw ins.error;
      Alert.alert('Sucesso', 'Meta salva com sucesso!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', e?.message || 'Não foi possível salvar a meta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title="Nova Meta" />
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
          <Animated.View style={item1Anim}>
            <Input label="Nome" value={nome} onChangeText={setNome} placeholder="Ex.: Viagem" error={nomeError} />
          </Animated.View>
          <Animated.View style={item2Anim}>
            <Input label="Valor" value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="0,00" error={valorError} />
          </Animated.View>
          <Animated.View style={item3Anim}>
            <DatePickerField label="Data de realização" value={dataRealizacao} onChange={setDataRealizacao} error={dataError} />
          </Animated.View>
          <Animated.View style={item4Anim}>
            <Input label="Descrição" value={descricao} onChangeText={setDescricao} placeholder="Detalhes da meta" multiline numberOfLines={3} inputStyle={{ height: 96, textAlignVertical: 'top' }} />
          </Animated.View>

          <Animated.View style={item5Anim}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button label="Cancelar" variant="secondary" onPress={() => navigation.goBack()} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label={saving ? 'Salvando…' : 'Salvar'} variant="primary" onPress={onSave} disabled={saving} />
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}
