import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { colors, spacing } from '../components/theme';
import styles from '../styles/screens/ItemListScreen.style';
import { supabase } from '../services/supabaseClient';
import { useRoute, useNavigation } from '@react-navigation/native';
import Clickable from '../components/Clickable';

function Row({ item, catMap }) {
  const navigation = useNavigation();
  const nomeCat = catMap[String(item?.categoria)] || 'Outros';
  const dateFmt = (d) => {
    if (!d) return '—';
    const parts = String(d).split('-');
    return parts.length === 3 ? `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}` : String(d);
  };
  return (
    <Clickable
      onPress={() => navigation.navigate('ItemDetail', { id: item.id, item })}
      androidRippleColor="#C7E7D1"
      accessibilityRole="button"
      style={({ pressed, hovered }) => ([
        { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
        (pressed || hovered) && {
          backgroundColor: '#F0FDF4',
          borderLeftWidth: 3,
          borderLeftColor: colors.green,
        },
      ])}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Text style={{ fontFamily: 'Poppins_500Medium', color: colors.text }}>{item?.nome || item?.descricao || `Despesa #${item.id}`}</Text>
      <Text style={{ marginTop: 4, color: colors.text, fontFamily: 'Poppins_400Regular' }}>Categoria: {nomeCat}</Text>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>Total: R$ {Number(item?.valor_total ?? 0).toFixed(2)}</Text>
        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>Parcela: {item?.valor_parcela != null ? `R$ ${Number(item.valor_parcela).toFixed(2)}` : '—'}</Text>
        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>Qtd: {item?.qtd_parcelas ?? '—'}</Text>
        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>Atual: {item?.parcela_atual ?? '—'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
        <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Compra: {dateFmt(item?.data_compra)}</Text>
        <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Vencimento: {dateFmt(item?.vencimento_parcela)}</Text>
        <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Tipo: {item?.tipo != null ? `#${item.tipo}` : '—'}</Text>
        <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Pagamento: {item?.metodo_pagamento != null ? `#${item.metodo_pagamento}` : '—'}</Text>
        <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Criado por: {item?.created_by || '—'}</Text>
      </View>
    </Clickable>
  );
}

export default function ItemListScreen() {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [catMap, setCatMap] = useState({});
  const [err, setErr] = useState(null);
  const route = useRoute();
  const filterCategoryName = route?.params?.filterCategoryName || null;

  const load = useCallback(async () => {
    try {
      // categorias
      let cat = await supabase.from('categoria').select('id, nome');
      if (cat.error) cat = await supabase.from('Categoria').select('id, nome');
      const map = {};
      (cat.data || []).forEach((c) => { map[String(c.id)] = c.nome; });
      setCatMap(map);

      // despesas
      let { data, error } = await supabase
        .from('Despesas')
        .select('id, nome, descricao, valor_total, valor_parcela, qtd_parcelas, parcela_atual, tipo, data_compra, vencimento_parcela, metodo_pagamento, created_by, categoria')
        .order('vencimento_parcela', { ascending: false })
        .limit(100);
      if (error) {
        ({ data, error } = await supabase
          .from('despesas')
          .select('id, nome, descricao, valor_total, valor_parcela, qtd_parcelas, parcela_atual, tipo, data_compra, vencimento_parcela, metodo_pagamento, created_by, categoria')
          .order('vencimento_parcela', { ascending: false })
          .limit(100));
      }
      if (error) throw error;
      const rows = data || [];
      console.log('[Itens] despesas carregadas:', rows.length);
      setItems(rows);
      setErr(null);
    } catch (e) {
      console.warn('Falha ao carregar despesas:', e?.message || e);
      setItems([]);
      setErr(String(e?.message || e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const data = useMemo(() => {
    if (!filterCategoryName) return items;
    return items.filter((it) => (catMap[String(it?.categoria)] || 'Outros') === filterCategoryName);
  }, [items, catMap, filterCategoryName]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Despesas</Text>
      <Text style={styles.subtitle}>
        {filterCategoryName ? `Filtrando por: ${filterCategoryName} — ` : ''}
        Total carregado: {data.length}{err ? ` — Erro: ${err}` : ''}
      </Text>
      <FlatList
        data={data}
        keyExtractor={(it) => String(it.id)}
        renderItem={({ item }) => <Row item={item} catMap={catMap} />}
        contentContainerStyle={{ paddingTop: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

// estilos movidos para styles/screens/ItemListScreen.styles.js
