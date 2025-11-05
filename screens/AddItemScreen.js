import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import Clickable from '../components/Clickable';
import { supabase } from '../services/supabaseClient';
import styles from '../styles/screens/AddItemScreen.style';

export default function AddItemScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [valorParcela, setValorParcela] = useState('');
  const [qtdParcelas, setQtdParcelas] = useState('');
  const [parcelaAtual, setParcelaAtual] = useState('');
  const [tipoId, setTipoId] = useState(''); // por enquanto id numérico
  const [metodoPagId, setMetodoPagId] = useState(''); // por enquanto id numérico
  const [dataCompra, setDataCompra] = useState('');
  const [vencimento, setVencimento] = useState(''); // YYYY-MM-DD
  const [categorias, setCategorias] = useState([]); // [{id, nome}]
  const [categoriaId, setCategoriaId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let res = await supabase.from('categoria').select('id, nome').order('nome', { ascending: true });
        if (res.error) {
          res = await supabase.from('Categoria').select('id, nome').order('nome', { ascending: true });
        }
        if (res.error) throw res.error;
        setCategorias(res.data || []);
      } catch (e) {
        console.warn('Falha ao carregar categorias:', e?.message || e);
        setCategorias([]);
      }
    })();
  }, []);

  const onSave = async () => {
    if (!nome) {
      Alert.alert('Atenção', 'Informe o Nome da despesa.');
      return;
    }
    if (!valorTotal && !valorParcela) {
      Alert.alert('Atenção', 'Informe Valor Total ou Valor Parcela.');
      return;
    }
    if (!vencimento || !categoriaId) {
      Alert.alert('Atenção', 'Preencha Vencimento e Categoria.');
      return;
    }
    const total = valorTotal ? Number(String(valorTotal).replace(',', '.')) : null;
    const parcela = valorParcela ? Number(String(valorParcela).replace(',', '.')) : null;
    const qtd = qtdParcelas ? Number(qtdParcelas) : null;
    const atual = parcelaAtual ? Number(parcelaAtual) : null;
    const tipo = tipoId ? Number(tipoId) : null;
    const metodo = metodoPagId ? Number(metodoPagId) : null;
    if ((total != null && (!isFinite(total) || total <= 0)) || (parcela != null && (!isFinite(parcela) || parcela <= 0))) {
      Alert.alert('Atenção', 'Valores inválidos.');
      return;
    }
    try {
      setSaving(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error('Usuário não autenticado');
      const createdBy = user.email || user.id;

      // Inserir na tabela Despesas (fallback para despesas)
      const payload = {
        nome,
        descricao: descricao || null,
        valor_total: total,
        valor_parcela: parcela,
        qtd_parcelas: qtd,
        parcela_atual: atual,
        tipo,
        data_compra: dataCompra || null,
        vencimento_parcela: vencimento,
        categoria: categoriaId,
        metodo_pagamento: metodo,
        created_by: createdBy,
      };

      let ins = await supabase.from('Despesas').insert(payload).select('id');
      if (ins.error) {
        ins = await supabase.from('despesas').insert(payload).select('id');
      }
      if (ins.error) throw ins.error;

      Alert.alert('Sucesso', 'Despesa salva com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', e?.message || 'Não foi possível salvar a despesa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Nova Despesa</Text>
      <View style={styles.form}>
        <Input label="Nome" value={nome} onChangeText={setNome} placeholder="Ex.: Fatura do cartão" />
        <Input label="Descrição" value={descricao} onChangeText={setDescricao} placeholder="Opcional" />
        <Input label="Valor Total (R$)" value={valorTotal} onChangeText={setValorTotal} placeholder="Ex.: 350,00" keyboardType="decimal-pad" />
        <Input label="Valor Parcela (R$)" value={valorParcela} onChangeText={setValorParcela} placeholder="Opcional" keyboardType="decimal-pad" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input label="Qtd Parcelas" value={qtdParcelas} onChangeText={setQtdParcelas} placeholder="Ex.: 12" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Parcela Atual" value={parcelaAtual} onChangeText={setParcelaAtual} placeholder="Ex.: 3" keyboardType="number-pad" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input label="Tipo (id)" value={tipoId} onChangeText={setTipoId} placeholder="Ex.: 1" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Método Pagamento (id)" value={metodoPagId} onChangeText={setMetodoPagId} placeholder="Ex.: 2" keyboardType="number-pad" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input label="Data da compra (AAAA-MM-DD)" value={dataCompra} onChangeText={setDataCompra} placeholder="Ex.: 2025-11-04" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Vencimento (AAAA-MM-DD)" value={vencimento} onChangeText={setVencimento} placeholder="Ex.: 2025-11-10" />
          </View>
        </View>

        <Text style={styles.subtitle}>Categoria</Text>
        <View style={styles.categoryWrap}>
          {categorias.map((c) => {
            const selected = categoriaId === c.id;
            return (
              <Clickable
                key={String(c.id)}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setCategoriaId(c.id)}
                androidRippleColor="#E5E7EB"
                accessibilityRole="button"
              >
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{c.nome}</Text>
              </Clickable>
            );
          })}
        </View>

        <View style={styles.saveBtn}>
          <Button label="Salvar despesa" onPress={onSave} loading={saving} variant="primary" icon="checkmark" />
        </View>
      </View>
    </ScrollView>
  );
}

// estilos movidos para styles/screens/AddItemScreen.styles.js
