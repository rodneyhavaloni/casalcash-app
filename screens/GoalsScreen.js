import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Button from '../components/Button';
import { supabase } from '../services/supabaseClient';
import { colors, spacing, typography } from '../components/theme';
import styles from '../styles/screens/GoalsScreen.style';

export default function GoalsScreen({ route, navigation }) {
  const mode = route?.params?.mode || 'list';

  // Estado do formulário (modo criar)
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const v = Number(String(valor).replace(/[^0-9.,-]/g, '').replace('.', '').replace(',', '.'));
    const s = Number(String(saldoInicial || '0').replace(/[^0-9.,-]/g, '').replace('.', '').replace(',', '.'));
    if (!nome.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome da meta.');
      return;
    }
    if (!isFinite(v) || v <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor alvo maior que zero.');
      return;
    }
    const saldo = isFinite(s) && s >= 0 ? s : 0;
    setSaving(true);
    try {
      const { error } = await supabase.from('metas').insert({ nome: nome.trim(), valor: v, saldo_avanco: saldo });
      if (error) throw error;
      Alert.alert('Meta criada', 'Sua meta foi criada com sucesso!', [
        { text: 'Ver dashboard', onPress: () => navigation.navigate('GoalsDashboard') },
        { text: 'OK', style: 'cancel', onPress: () => navigation.setParams({ mode: 'list' }) },
      ]);
    } catch (e) {
      Alert.alert('Erro ao salvar', e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'create') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: colors.text, fontFamily: 'Poppins_700Bold', fontSize: 20, marginBottom: spacing.md }}>Nova Meta</Text>

          <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium', marginBottom: 6 }}>Nome</Text>
          <TextInput
            placeholder="Ex.: Viagem, Reserva de emergência"
            placeholderTextColor="#9CA3AF"
            value={nome}
            onChangeText={setNome}
            style={{
              backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 12, color: colors.text,
              fontFamily: 'Poppins_400Regular', marginBottom: spacing.md,
            }}
            returnKeyType="next"
          />

          <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium', marginBottom: 6 }}>Valor alvo (R$)</Text>
          <TextInput
            placeholder="Ex.: 5000"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={valor}
            onChangeText={setValor}
            style={{
              backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 12, color: colors.text,
              fontFamily: 'Poppins_400Regular', marginBottom: spacing.md,
            }}
            returnKeyType="done"
          />

          <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium', marginBottom: 6 }}>Saldo inicial (opcional)</Text>
          <TextInput
            placeholder="Ex.: 0"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={saldoInicial}
            onChangeText={setSaldoInicial}
            style={{
              backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 12, color: colors.text,
              fontFamily: 'Poppins_400Regular', marginBottom: spacing.lg,
            }}
            returnKeyType="done"
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button label="Cancelar" variant="secondary" onPress={() => navigation.setParams({ mode: 'list' })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={saving ? 'Salvando…' : 'Salvar'} variant="green" onPress={handleSave} disabled={saving} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Metas Financeiras</Text>
      <Text style={styles.subtitle}>Em breve: criar/listar/editar metas e progresso…</Text>
      <View style={{ height: spacing.md }} />
      <Button label="Nova Meta" variant="green" onPress={() => navigation.setParams({ mode: 'create' })} />
    </View>
  );
}

// estilos movidos para styles/screens/GoalsScreen.styles.js
