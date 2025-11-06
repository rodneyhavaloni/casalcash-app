import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Platform, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../components/theme';
import { supabase } from '../services/supabaseClient';
import Card from '../components/Card';
import TopBar from '../components/TopBar';
import Input from '../components/Input';
import Button from '../components/Button';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

export default function ItemDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id: paramId, item: itemParam } = route.params || {};

  const [item, setItem] = useState(itemParam || null);
  const [loading, setLoading] = useState(!itemParam && !!paramId);
  const [error, setError] = useState(null);
  const [catById, setCatById] = useState({});
  const [tipoById, setTipoById] = useState({});
  const [metodoById, setMetodoById] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [tipoPickerOpen, setTipoPickerOpen] = useState(false);
  const [metodoPickerOpen, setMetodoPickerOpen] = useState(false);
  const [savingParcela, setSavingParcela] = useState(null);

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    valor_total: '',
    valor_parcela: '',
    qtd_parcelas: '',
    parcela_atual: '',
    tipo: '',
    metodo_pagamento: '',
    data_compra: '',
    vencimento_parcela: '',
    categoria: null,
  });

  const fmtCurrency = useCallback((n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0)), []);
  const fmtDate = useCallback((d) => {
    if (!d) return '—';
    const parts = String(d).split('-');
    return parts.length === 3 ? `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}` : String(d);
  }, []);

  // Carrega categorias para mapear nome/ícone/cor
  useEffect(() => {
    (async () => {
      try {
        let cat = await supabase.from('categoria').select('id, nome, cor, icone');
        if (cat.error) cat = await supabase.from('Categoria').select('id, nome, cor, icone');
        const map = {};
        (cat.data || []).forEach((c) => { map[String(c.id)] = c; });
        setCatById(map);
      } catch {}
    })();
  }, []);

  // Carrega tabelas de referência para tipo e método de pagamento (com fallbacks robustos)
  useEffect(() => {
    (async () => {
      try {
        // TIPOS: prioriza tabela "tipo de despesa" com coluna 'tipo'; depois 'nome'; fallback identidade se 'tipo' já for textual em Despesas
        const tryTipo = async () => {
          const map = {};
          // 1) Tabela oficial: 'tipo de despesa' com coluna 'tipo'
          let r = await supabase.from('tipo de despesa').select('id, tipo');
          if (!r.error) {
            (r.data || []).forEach((row) => { if (row?.id != null && row?.tipo != null) map[String(row.id)] = row.tipo; });
          }
          // 2) Se vazio, tenta com coluna 'nome'
          if (!Object.keys(map).length) {
            r = await supabase.from('tipo de despesa').select('id, nome');
            if (!r.error) (r.data || []).forEach((row) => { if (row?.id != null && row?.nome != null) map[String(row.id)] = row.nome; });
          }
          // 3) Fallback: identidade de strings presentes em Despesas.tipo
          if (!Object.keys(map).length) {
            let dr = await supabase.from('Despesas').select('tipo');
            if (dr.error) dr = await supabase.from('despesas').select('tipo');
            if (!dr.error) {
              (dr.data || []).forEach((row) => { const v = row?.tipo; if (typeof v === 'string' && v.trim()) { const key = v.trim(); map[key] = key; } });
            }
          }
          // Monta mapa completo: id->obj com label
          const tMap = {};
          Object.entries(map).forEach(([k, v]) => { tMap[String(k)] = { id: k, label: v, nome: v, tipo: v }; });
          setTipoById(tMap);
        };

        // MÉTODOS: busca variações conhecidas com colunas id,nome
        const tryMetodo = async () => {
          let r = await supabase.from('metodo_pagamento').select('id, nome');
          if (r.error) r = await supabase.from('MetodoPagamento').select('id, nome');
          if (r.error) r = await supabase.from('metodopagamento').select('id, nome');
          if (r.error) r = await supabase.from('metodos_pagamento').select('id, nome');
          if (r.error) r = await supabase.from('MetodosPagamento').select('id, nome');
          if (!r.error) {
            const mMap = {}; (r.data || []).forEach((row) => { mMap[String(row.id)] = { ...row, label: row.nome }; });
            setMetodoById(mMap);
          } else {
            setMetodoById({});
          }
        };

        await Promise.all([tryTipo(), tryMetodo()]);
      } catch (e) {
        // mantém mapas vazios em caso de erro
        setTipoById({});
        setMetodoById({});
      }
    })();
  }, []);

  const loadItem = useCallback(async (id) => {
    try {
      setLoading(true);
      let { data, error } = await supabase
        .from('Despesas')
        .select('id, nome, descricao, valor_total, valor_parcela, qtd_parcelas, parcela_atual, tipo, data_compra, vencimento_parcela, metodo_pagamento, created_by, categoria')
        .eq('id', id)
        .single();
      if (error) {
        ({ data, error } = await supabase
          .from('despesas')
          .select('id, nome, descricao, valor_total, valor_parcela, qtd_parcelas, parcela_atual, tipo, data_compra, vencimento_parcela, metodo_pagamento, created_by, categoria')
          .eq('id', id)
          .single());
      }
      if (error) throw error;
      setItem(data || null);
      setError(null);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!item && paramId != null) loadItem(paramId);
  }, [item, paramId, loadItem]);

  const catInfo = useMemo(() => {
    const catId = item?.categoria != null ? String(item.categoria) : null;
    const c = (catId && catById[catId]) ? catById[catId] : null;
    return {
      nome: c?.nome || 'Outros',
      cor: c?.cor || '#9CA3AF',
      icone: c?.icone || 'pricetag-outline',
    };
  }, [item, catById]);

  // Preenche formulário ao entrar em modo edição
  useEffect(() => {
    if (editMode && item) {
      setForm({
        nome: String(item?.nome || ''),
        descricao: String(item?.descricao || ''),
        valor_total: item?.valor_total != null ? String(item.valor_total) : '',
        valor_parcela: item?.valor_parcela != null ? String(item.valor_parcela) : '',
        qtd_parcelas: item?.qtd_parcelas != null ? String(item.qtd_parcelas) : '',
        parcela_atual: item?.parcela_atual != null ? String(item.parcela_atual) : '',
        tipo: item?.tipo != null ? String(item.tipo) : '',
        metodo_pagamento: item?.metodo_pagamento != null ? String(item.metodo_pagamento) : '',
        data_compra: item?.data_compra || '',
        vencimento_parcela: item?.vencimento_parcela || '',
        categoria: item?.categoria != null ? item.categoria : null,
      });
    }
  }, [editMode, item]);

  const validateDate = (s) => {
    if (!s) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
  };

  const toNumberOrNull = (s, isInt = false) => {
    if (s === '' || s == null) return null;
    const n = isInt ? parseInt(String(s).replace(/,/g, '.'), 10) : parseFloat(String(s).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  // Converte IDs vindos do dropdown para número quando apropriado, mantendo texto quando não-numérico
  const toIdOrText = (s) => {
    if (s == null) return null;
    const v = String(s).trim();
    if (!v) return null;
    return /^\d+$/.test(v) ? parseInt(v, 10) : v;
  };

  const onSave = async () => {
    try {
      if (!item) return;
      // Validações simples
      if (!validateDate(form.data_compra) || !validateDate(form.vencimento_parcela)) {
        setError('Datas devem estar no formato YYYY-MM-DD');
        return;
      }
      setSaving(true);
      setError(null);
      const upd = {
        nome: form.nome?.trim() || null,
        descricao: form.descricao?.trim() || null,
        valor_total: toNumberOrNull(form.valor_total, false),
        valor_parcela: toNumberOrNull(form.valor_parcela, false),
        qtd_parcelas: toNumberOrNull(form.qtd_parcelas, true),
        parcela_atual: toNumberOrNull(form.parcela_atual, true),
        tipo: toIdOrText(form.tipo),
        metodo_pagamento: toIdOrText(form.metodo_pagamento),
        data_compra: form.data_compra?.trim() || null,
        vencimento_parcela: form.vencimento_parcela?.trim() || null,
        categoria: form.categoria != null ? form.categoria : null,
      };
      // Remove undefined
      Object.keys(upd).forEach((k) => { if (upd[k] === undefined) delete upd[k]; });

      let resp = await supabase.from('Despesas').update(upd).eq('id', item.id).select('*').single();
      if (resp.error) {
        resp = await supabase.from('despesas').update(upd).eq('id', item.id).select('*').single();
      }
      if (resp.error) throw resp.error;
      const updated = resp.data || { ...item, ...upd };
      setItem(updated);
      setEditMode(false);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  // Atualiza parcela_atual rapidamente ao tocar em um "chip" de parcela
  const updateParcelaAtual = async (n) => {
    if (!item || !Number.isInteger(n)) return;
    try {
      setSavingParcela(n);
      setError(null);
      // Atualização otimista para refletir imediatamente na UI
      const prev = item.parcela_atual;
      setItem((it) => ({ ...(it || {}), parcela_atual: n }));
      if (editMode) setForm((f) => ({ ...f, parcela_atual: String(n) }));
      let resp = await supabase.from('Despesas').update({ parcela_atual: n }).eq('id', item.id).select('*').single();
      if (resp.error) {
        resp = await supabase.from('despesas').update({ parcela_atual: n }).eq('id', item.id).select('*').single();
      }
      if (resp.error) throw resp.error;
      if (resp.data) setItem(resp.data);

      // Tenta persistir também em uma tabela relacionada de parcelas, se existir
      await persistParcelaRelatedTables(item.id, n);
    } catch (e) {
      // Reverte em caso de falha
      setItem((it) => ({ ...(it || {}), parcela_atual: it?.parcela_atual ?? null }));
      setError(String(e?.message || e));
    } finally {
      setSavingParcela(null);
    }
  };

  // Persiste seleção de parcela em possíveis tabelas auxiliares (robusto a variações de nome)
  const persistParcelaRelatedTables = async (despesaId, parcela) => {
    const tableCandidates = [
      'despesa_parcelas', 'despesas_parcelas',
      'DespesaParcelas', 'DespesasParcelas',
      'parcelas_status', 'ParcelasStatus',
    ];
    const idColumns = ['despesa_id', 'despesa'];
    const parcelaColumns = ['parcela_atual', 'atual'];

    for (const table of tableCandidates) {
      try {
        let updated = false;
        for (const idCol of idColumns) {
          for (const pCol of parcelaColumns) {
            // Tentativa de update
            let r = await supabase.from(table).update({ [pCol]: parcela, updated_at: new Date().toISOString() }).eq(idCol, despesaId).select('id').limit(1);
            if (!r.error) {
              if (Array.isArray(r.data) && r.data.length > 0) { updated = true; break; }
              // Inserção caso não exista
              const insertPayload = { [idCol]: despesaId, [pCol]: parcela, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
              r = await supabase.from(table).insert(insertPayload).select('id').limit(1);
              if (!r.error && Array.isArray(r.data) && r.data.length > 0) { updated = true; break; }
            }
          }
          if (updated) break;
        }
        if (updated) return; // sucesso em alguma variação
      } catch (e) {
        // ignora e tenta próxima variação
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar
        title="Detalhes"
        left={(
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            android_ripple={{ color: '#bbf7d0' }}
            style={({ pressed }) => ([
              { padding: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
              pressed && { opacity: 0.9 },
              Platform.OS === 'web' && { cursor: 'pointer' },
            ])}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
        )}
        right={(
          <Pressable
            onPress={() => (editMode ? onSave() : setEditMode(true))}
            accessibilityRole="button"
            android_ripple={{ color: '#bbf7d0' }}
            style={({ pressed }) => ([
              { padding: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
              pressed && { opacity: 0.9 },
              Platform.OS === 'web' && { cursor: 'pointer' },
            ])}
            disabled={saving}
          >
            <Ionicons name={editMode ? 'checkmark' : 'pencil'} size={20} color="#FFFFFF" />
          </Pressable>
        )}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      {/* Cabeçalho: quadro verde com ícone Categoria - nome da despesa */}
      <Animated.View
        entering={FadeInDown.duration(350)}
        layout={Layout.springify()}
        style={{
          backgroundColor: colors.green,
          borderRadius: 12,
          padding: spacing.md,
          marginBottom: spacing.md,
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: catInfo.cor, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Ionicons name={catInfo.icone} size={16} color="#FFFFFF" />
          </View>
          <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' }}>{catInfo.nome}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', marginHorizontal: 6 }}>—</Text>
          <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_700Bold', fontSize: 22, flexShrink: 1 }}>
            {item?.nome || item?.descricao || (paramId != null ? `Despesa #${paramId}` : 'Despesa')}
          </Text>
        </View>
      </Animated.View>

      {/* Estado de carregamento/erro */}
      {loading && (
        <View style={{ paddingVertical: spacing.lg }}>
          <ActivityIndicator color={colors.green} />
          <Text style={{ marginTop: 8, color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Carregando item…</Text>
        </View>
      )}
      {error && (
        <View style={{ paddingVertical: spacing.md }}>
          <Text style={{ color: '#DC2626', fontFamily: 'Poppins_500Medium' }}>Erro: {error}</Text>
        </View>
      )}

      {/* Seleção rápida de parcela (sempre visível quando há qtd_parcelas) */}
      {item?.qtd_parcelas > 0 && (
        <Animated.View entering={FadeInDown.delay(60).duration(350)} layout={Layout.springify()}>
          <Card title="Parcelas" style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular', marginBottom: 8 }}>Toque para marcar a parcela atual</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', paddingVertical: 2 }}>
                {Array.from({ length: Number(item.qtd_parcelas) }, (_, i) => i + 1).map((n, idx) => {
                const current = Number(item.parcela_atual) || 0;
                const selected = current === n;
                const isPast = current > 0 && n < current;
                const isFuture = n > current;
                  return (
                    <Animated.View
                      key={n}
                      entering={FadeInDown.delay(100 + idx * 25)}
                      layout={Layout.springify()}
                      style={{
                        paddingHorizontal: 0,
                        height: 36,
                        borderRadius: 18,
                        borderWidth: selected ? 0 : 1,
                        borderColor: isPast ? '#D1FAE5' : '#E5E7EB',
                        backgroundColor: selected ? colors.green : (isPast ? 'rgba(141,185,134,0.12)' : '#FFFFFF'),
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 8,
                        minWidth: 36,
                        overflow: 'hidden',
                      }}
                    >
                      <Pressable
                        onPress={() => updateParcelaAtual(n)}
                        disabled={savingParcela != null}
                        android_ripple={{ color: '#E5E7EB' }}
                        style={({ pressed }) => ([
                          { paddingHorizontal: 12, height: 36, alignItems: 'center', justifyContent: 'center' },
                          pressed && { opacity: 0.96 },
                        ])}
                      >
                        {savingParcela === n ? (
                          <ActivityIndicator color={selected ? '#FFFFFF' : colors.green} size="small" />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {(selected || isPast) && (
                              <Ionicons
                                name={selected ? 'checkmark' : 'checkmark-done'}
                                size={14}
                                color={selected ? '#FFFFFF' : colors.green}
                                style={{ marginRight: 4 }}
                              />
                            )}
                            <Text style={{
                              color: selected ? '#FFFFFF' : (isPast ? colors.green : colors.text),
                              fontFamily: 'Poppins_600SemiBold',
                              fontSize: 14,
                            }}>
                              {n}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </ScrollView>
          </Card>
        </Animated.View>
      )}

      {item && !editMode && (
        <>
          {/* Valores */}
          <Animated.View entering={FadeInUp.delay(120).duration(320)} layout={Layout.springify()}>
            <Card title="Valores">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Field label="Valor total" value={fmtCurrency(item?.valor_total)} />
              <Field label="Valor da parcela" value={item?.valor_parcela != null ? fmtCurrency(item.valor_parcela) : '—'} />
              <Field label="Qtd parcelas" value={item?.qtd_parcelas != null ? String(item.qtd_parcelas) : '—'} />
            </View>
            </Card>
          </Animated.View>

          {/* Informações */}
          <Animated.View entering={FadeInUp.delay(160).duration(320)} layout={Layout.springify()}>
            <Card title="Informações" style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Field label="Tipo" value={(item?.tipo != null && (tipoById[String(item.tipo)]?.label || tipoById[String(item.tipo)]?.nome)) || (item?.tipo != null ? String(item.tipo) : '—')} />
              <Field label="Método de pagamento" value={(item?.metodo_pagamento != null && (metodoById[String(item.metodo_pagamento)]?.label || metodoById[String(item.metodo_pagamento)]?.nome)) || (item?.metodo_pagamento != null ? String(item.metodo_pagamento) : '—')} />
              <Field label="Data da compra" value={fmtDate(item?.data_compra)} />
              <Field label="Vencimento" value={fmtDate(item?.vencimento_parcela)} />
              <Field label="Criado por" value={item?.created_by ? String(item.created_by) : '—'} />
              <Field label="Categoria" value={catInfo?.nome || '—'} />
            </View>
            </Card>
          </Animated.View>

          {/* Descrição */}
          {(item?.descricao || item?.nome) && (
            <Animated.View entering={FadeInUp.delay(200).duration(320)} layout={Layout.springify()}>
              <Card title="Descrição" style={{ marginTop: spacing.md }}>
                <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>
                  {item?.descricao || item?.nome}
                </Text>
              </Card>
            </Animated.View>
          )}
        </>
      )}

      {item && editMode && (
        <>
          {/* Editar Valores */}
          <Animated.View entering={FadeInUp.delay(120).duration(320)} layout={Layout.springify()}>
            <Card title="Editar valores">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={{ width: '50%', paddingRight: spacing.md }}>
                <Input label="Valor total" value={form.valor_total} onChangeText={(t) => setForm((f) => ({ ...f, valor_total: t }))} keyboardType="decimal-pad" placeholder="0,00" />
              </View>
              <View style={{ width: '50%', paddingRight: 0 }}>
                <Input label="Valor da parcela" value={form.valor_parcela} onChangeText={(t) => setForm((f) => ({ ...f, valor_parcela: t }))} keyboardType="decimal-pad" placeholder="0,00" />
              </View>
              <View style={{ width: '50%', paddingRight: spacing.md }}>
                <Input label="Qtd parcelas" value={form.qtd_parcelas} onChangeText={(t) => setForm((f) => ({ ...f, qtd_parcelas: t }))} keyboardType="number-pad" placeholder="ex: 12" />
              </View>
            </View>
            </Card>
          </Animated.View>

          {/* Editar Informações */}
          <Animated.View entering={FadeInUp.delay(160).duration(320)} layout={Layout.springify()}>
            <Card title="Editar informações" style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={{ width: '50%', paddingRight: spacing.md }}>
                <Pressable
                  onPress={() => setTipoPickerOpen(true)}
                  accessibilityRole="button"
                  android_ripple={{ color: '#E5E7EB' }}
                  style={({ pressed }) => ([pressed && { opacity: 0.96 }, Platform.OS === 'web' && { cursor: 'pointer' }])}
                >
                  <Input
                    label="Tipo"
                    value={(form.tipo != null && (tipoById[String(form.tipo)]?.label || tipoById[String(form.tipo)]?.nome)) || (form.tipo || '')}
                    placeholder="Selecione o tipo"
                    editable={false}
                    right={<Ionicons name="chevron-down" size={16} color={colors.muted} />}
                  />
                </Pressable>
              </View>
              <View style={{ width: '50%', paddingRight: 0 }}>
                <Pressable
                  onPress={() => setMetodoPickerOpen(true)}
                  accessibilityRole="button"
                  android_ripple={{ color: '#E5E7EB' }}
                  style={({ pressed }) => ([pressed && { opacity: 0.96 }, Platform.OS === 'web' && { cursor: 'pointer' }])}
                >
                  <Input
                    label="Método de pagamento"
                    value={(form.metodo_pagamento != null && (metodoById[String(form.metodo_pagamento)]?.label || metodoById[String(form.metodo_pagamento)]?.nome)) || (form.metodo_pagamento || '')}
                    placeholder="Selecione o método"
                    editable={false}
                    right={<Ionicons name="chevron-down" size={16} color={colors.muted} />}
                  />
                </Pressable>
              </View>
              <View style={{ width: '50%', paddingRight: spacing.md }}>
                <Input label="Data da compra" value={form.data_compra} onChangeText={(t) => setForm((f) => ({ ...f, data_compra: t }))} placeholder="YYYY-MM-DD" autoCapitalize="none" autoCorrect={false} />
              </View>
              <View style={{ width: '50%', paddingRight: 0 }}>
                <Input label="Vencimento" value={form.vencimento_parcela} onChangeText={(t) => setForm((f) => ({ ...f, vencimento_parcela: t }))} placeholder="YYYY-MM-DD" autoCapitalize="none" autoCorrect={false} />
              </View>
              <View style={{ width: '100%', paddingRight: 0 }}>
                <Pressable
                  onPress={() => setCatPickerOpen(true)}
                  accessibilityRole="button"
                  android_ripple={{ color: '#E5E7EB' }}
                  style={({ pressed }) => ([pressed && { opacity: 0.96 }, Platform.OS === 'web' && { cursor: 'pointer' }])}
                >
                  <Input
                    label="Categoria"
                    value={(form.categoria != null && catById[String(form.categoria)]?.nome) || ''}
                    placeholder="Selecione a categoria"
                    editable={false}
                    right={<Ionicons name="chevron-down" size={16} color={colors.muted} />}
                  />
                </Pressable>
              </View>
              <View style={{ width: '100%', paddingTop: spacing.sm }}>
                <Input label="Nome" value={form.nome} onChangeText={(t) => setForm((f) => ({ ...f, nome: t }))} placeholder="Título da despesa" />
                <Input label="Descrição" value={form.descricao} onChangeText={(t) => setForm((f) => ({ ...f, descricao: t }))} placeholder="Detalhes adicionais" multiline />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.md }}>
              <Button label="Cancelar" variant="secondary" onPress={() => { setEditMode(false); setError(null); }} />
              <Button label={saving ? 'Salvando...' : 'Salvar'} onPress={onSave} icon="checkmark" loading={saving} />
            </View>
            </Card>
          </Animated.View>

          {/* Modal seletor de categoria */}
          <Modal visible={catPickerOpen} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
              <Pressable style={{ flex: 1 }} onPress={() => setCatPickerOpen(false)} />
              <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' }}>
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontFamily: 'Poppins_700Bold', fontSize: 18 }}>Selecionar categoria</Text>
                  <Pressable onPress={() => setCatPickerOpen(false)} accessibilityLabel="Fechar" style={{ padding: 6 }}>
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </Pressable>
                </View>
                <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                  {Object.values(catById).map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => { setForm((f) => ({ ...f, categoria: c.id })); setCatPickerOpen(false); }}
                      android_ripple={{ color: '#E5E7EB' }}
                      style={({ pressed }) => ([
                        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
                        pressed && { opacity: 0.96 },
                      ])}
                    >
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.cor || '#9CA3AF', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={c.icone || 'pricetag-outline'} size={14} color="#FFFFFF" />
                      </View>
                      <Text style={{ marginLeft: 10, color: colors.text, fontFamily: 'Poppins_400Regular' }}>{c.nome}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal seletor de tipo */}
          <Modal visible={tipoPickerOpen} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
              <Pressable style={{ flex: 1 }} onPress={() => setTipoPickerOpen(false)} />
              <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' }}>
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontFamily: 'Poppins_700Bold', fontSize: 18 }}>Selecionar tipo</Text>
                  <Pressable onPress={() => setTipoPickerOpen(false)} accessibilityLabel="Fechar" style={{ padding: 6 }}>
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </Pressable>
                </View>
                <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                  {/* Se valor atual não existir no mapa, oferecer opção para manter */}
                  {form.tipo && !tipoById[String(form.tipo)] && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular', marginBottom: 6 }}>Valor atual (texto)</Text>
                      <Pressable
                        onPress={() => { setForm((f) => ({ ...f, tipo: f.tipo })); setTipoPickerOpen(false); }}
                        android_ripple={{ color: '#E5E7EB' }}
                        style={({ pressed }) => ([
                          { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
                          pressed && { opacity: 0.96 },
                        ])}
                      >
                        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>{String(form.tipo)}</Text>
                      </Pressable>
                    </View>
                  )}
                  {Object.values(tipoById).map((t) => (
                    <Pressable
                      key={String(t.id)}
                      onPress={() => { setForm((f) => ({ ...f, tipo: String(t.id) })); setTipoPickerOpen(false); }}
                      android_ripple={{ color: '#E5E7EB' }}
                      style={({ pressed }) => ([
                        { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
                        pressed && { opacity: 0.96 },
                      ])}
                    >
                      <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>{t.label || t.nome || String(t.id)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal seletor de método de pagamento */}
          <Modal visible={metodoPickerOpen} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
              <Pressable style={{ flex: 1 }} onPress={() => setMetodoPickerOpen(false)} />
              <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' }}>
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontFamily: 'Poppins_700Bold', fontSize: 18 }}>Selecionar método</Text>
                  <Pressable onPress={() => setMetodoPickerOpen(false)} accessibilityLabel="Fechar" style={{ padding: 6 }}>
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </Pressable>
                </View>
                <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
                  {/* Se valor atual não existir no mapa, oferecer opção para manter */}
                  {form.metodo_pagamento && !metodoById[String(form.metodo_pagamento)] && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular', marginBottom: 6 }}>Valor atual (texto)</Text>
                      <Pressable
                        onPress={() => { setForm((f) => ({ ...f, metodo_pagamento: f.metodo_pagamento })); setMetodoPickerOpen(false); }}
                        android_ripple={{ color: '#E5E7EB' }}
                        style={({ pressed }) => ([
                          { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
                          pressed && { opacity: 0.96 },
                        ])}
                      >
                        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>{String(form.metodo_pagamento)}</Text>
                      </Pressable>
                    </View>
                  )}
                  {Object.values(metodoById).map((m) => (
                    <Pressable
                      key={String(m.id)}
                      onPress={() => { setForm((f) => ({ ...f, metodo_pagamento: String(m.id) })); setMetodoPickerOpen(false); }}
                      android_ripple={{ color: '#E5E7EB' }}
                      style={({ pressed }) => ([
                        { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
                        pressed && { opacity: 0.96 },
                      ])}
                    >
                      <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>{m.label || m.nome || String(m.id)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </>
      )}
      </ScrollView>
    </View>
  );
}

function Field({ label, value }) {
  return (
    <View style={{ width: '50%', paddingVertical: 6, paddingRight: spacing.md }}>
      <Text style={{ color: colors.muted, fontFamily: 'Poppins_500Medium', marginBottom: 2 }}>{label}</Text>
      <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>{value}</Text>
    </View>
  );
}

// estilos migrados para styles/screens/ItemDetailScreen.css
