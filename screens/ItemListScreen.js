import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, RefreshControl, Pressable, Platform, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../components/theme';
import styles from '../styles/screens/ItemListScreen.style';
import { supabase } from '../services/supabaseClient';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import TopBar from '../components/TopBar';
import Chip from '../components/Chip';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { BarChart } from 'react-native-chart-kit';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';

function Row({ item, catMap, categoryStyleByName, tipoById, metodoById }) {
  const navigation = useNavigation();
  const nomeCat = catMap[String(item?.categoria)] || 'Outros';
  const catStyle = categoryStyleByName[nomeCat] || {};
  const catColor = catStyle.color || '#9CA3AF';
  const catIcon = catStyle.icon || 'pricetag-outline';
  const dateFmt = (d) => {
    if (!d) return '—';
    const parts = String(d).split('-');
    return parts.length === 3 ? `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}` : String(d);
  };
  return (
    <Pressable
      onPress={() => navigation.navigate('ItemDetail', { id: item.id, item })}
      android_ripple={{ color: '#C7E7D1' }}
      accessibilityRole="button"
      style={({ pressed, hovered }) => ([
        { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
        (pressed || hovered) && {
          backgroundColor: '#F0FDF4',
          borderLeftWidth: 3,
          borderLeftColor: colors.green,
        },
        Platform.OS === 'web' && { cursor: 'pointer' },
      ])}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: catColor, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={catIcon} size={16} color={'#FFFFFF'} />
        </View>
        <Text style={{ fontFamily: 'Poppins_500Medium', color: colors.text, flexShrink: 1 }} numberOfLines={1}>
          {item?.nome || item?.descricao || `Despesa #${item.id}`}
        </Text>
      </View>
      <View style={{ marginTop: 6, alignSelf: 'flex-start', backgroundColor: catColor, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 10 }}>
        <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_400Regular' }}>{nomeCat}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>Total: R$ {Number(item?.valor_total ?? 0).toFixed(2)}</Text>
        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>Parcela: {item?.valor_parcela != null ? `R$ ${Number(item.valor_parcela).toFixed(2)}` : '—'}</Text>
        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>Qtd: {item?.qtd_parcelas ?? '—'}</Text>
        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }}>Atual: {item?.parcela_atual ?? '—'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
        <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Compra: {dateFmt(item?.data_compra)}</Text>
        <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Vencimento: {dateFmt(item?.vencimento_parcela)}</Text>
        <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>
          Tipo: {(() => {
            const id = item?.tipo;
            if (id == null || id === '') return '—';
            const label = tipoById?.[String(id)]?.label || tipoById?.[String(id)]?.nome;
            return label || (typeof id === 'string' ? id : `#${id}`);
          })()}
        </Text>
        <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>
          Pagamento: {(() => {
            const id = item?.metodo_pagamento;
            if (id == null || id === '') return '—';
            const label = metodoById?.[String(id)]?.label || metodoById?.[String(id)]?.nome;
            return label || (typeof id === 'string' ? id : `#${id}`);
          })()}
        </Text>
        <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Criado por: {item?.created_by || '—'}</Text>
      </View>
    </Pressable>
  );
}

export default function ItemListScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [catMap, setCatMap] = useState({});
  const [categoryStyleByName, setCategoryStyleByName] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [tipoById, setTipoById] = useState({});
  const [metodoById, setMetodoById] = useState({});
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [err, setErr] = useState(null);
  const route = useRoute();
  const initialFilterParam = route?.params?.filterCategoryName || route?.params?.filterCategoryNames || null;
  const initialSelectedCategories = Array.isArray(initialFilterParam)
    ? initialFilterParam.filter(Boolean)
    : (initialFilterParam ? [initialFilterParam] : []);
  const [selectedCategories, setSelectedCategories] = useState(initialSelectedCategories); // array de nomes de categoria
  const [mode, setMode] = useState('despesas'); // 'despesas' | 'categorias'
  const [searchCat, setSearchCat] = useState('');
  // Filtros avançados (apenas no modo despesas)
  const [sortDir, setSortDir] = useState(null); // 'asc' | 'desc' | null
  const [period, setPeriod] = useState(null); // 'mes' | 'proximos' | 'anual' | null
  const [statusAtivos, setStatusAtivos] = useState(false);
  const [statusEncerrados, setStatusEncerrados] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customStart, setCustomStart] = useState(''); // YYYY-MM-DD
  const [customEnd, setCustomEnd] = useState('');   // YYYY-MM-DD
  const filtersActive = useMemo(
    () => !!((selectedCategories?.length || 0) > 0 || sortDir || period || statusAtivos || statusEncerrados || (customStart && customStart.trim()) || (customEnd && customEnd.trim())),
    [selectedCategories, sortDir, period, statusAtivos, statusEncerrados, customStart, customEnd]
  );
  // Tick para detectar foco da tela e reanimar wrapper principal
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusTick((t) => t + 1);
    }, [])
  );
  // Assinatura para re-montar blocos e reexecutar animações ao alterar filtros/modo
  const filterKey = useMemo(() => {
    const cats = (selectedCategories || []).slice().sort().join('|') || '-';
    const sd = sortDir || '-';
    const pd = period || '-';
    const sa = statusAtivos ? '1' : '0';
    const se = statusEncerrados ? '1' : '0';
    const cs = (customStart && customStart.trim()) || '-';
    const ce = (customEnd && customEnd.trim()) || '-';
    return [mode, cats, sd, pd, sa, se, cs, ce].join('_');
  }, [mode, selectedCategories, sortDir, period, statusAtivos, statusEncerrados, customStart, customEnd]);
  // Assinatura de dados para reanimação mesmo quando length não muda
  const dataSignature = useMemo(() => {
    try {
      const ids = (data || []).map((x) => x?.id).filter((v) => v != null).join(',');
      const sum = (data || []).reduce((acc, x) => acc + (Number(x?.valor_total) || 0), 0);
      return `${ids.slice(0, 400)}|${sum.toFixed(2)}`;
    } catch {
      return `${(data || []).length}`;
    }
  }, [data]);
  const chartSignature = useMemo(() => {
    try {
      const labels = (monthlyChart?.labels || []).join(',');
      const values = (monthlyChart?.values || []).join(',');
      return `${labels}|${values}`;
    } catch {
      return `${monthlyChart?.labels?.length || 0}`;
    }
  }, [monthlyChart]);
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - spacing.lg * 2 - 12; // padding do Card e ajuste
  const approxCharPx = 8;
  const colW = 9 * approxCharPx + spacing.sm * 2;
  const totalCols = 10;
  const nameColW = Math.floor(colW * 2.5); // coluna do nome mais larga para caber textos longos
  const tableTotalWidth = nameColW + colW * (totalCols - 1);

  const fmtCurrency = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0));
  const chartScrollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      // categorias
      let cat = await supabase.from('categoria').select('id, nome, cor, icone').order('nome', { ascending: true });
      if (cat.error) cat = await supabase.from('Categoria').select('id, nome, cor, icone').order('nome', { ascending: true });
      const map = {};
      const styleByName = {};
      (cat.data || []).forEach((c) => {
        map[String(c.id)] = c.nome;
        if (c?.nome) styleByName[String(c.nome)] = { color: c?.cor || c?.color || null, icon: c?.icone || c?.icon || null };
      });
      setCatMap(map);
      setCategoryStyleByName(styleByName);
      setCategorias(cat.data || []);

      // TIPOS: replicar estratégia da Home (tenta oficial, depois fallback)
      const tipoMap = {};
      let tr = await supabase.from('tipo de despesa').select('id, tipo');
      if (!tr.error) {
        (tr.data || []).forEach((row) => { if (row?.id != null && row?.tipo != null) tipoMap[String(row.id)] = { id: row.id, label: row.tipo, nome: row.tipo, tipo: row.tipo }; });
      }
      if (!Object.keys(tipoMap).length) {
        tr = await supabase.from('tipo de despesa').select('id, nome');
        if (!tr.error) (tr.data || []).forEach((row) => { if (row?.id != null && row?.nome != null) tipoMap[String(row.id)] = { id: row.id, label: row.nome, nome: row.nome, tipo: row.nome }; });
      }
      if (!Object.keys(tipoMap).length) {
        // fallback identidade de strings presentes em Despesas.tipo
        let dr = await supabase.from('Despesas').select('tipo');
        if (dr.error) dr = await supabase.from('despesas').select('tipo');
        if (!dr.error) {
          (dr.data || []).forEach((row) => {
            const v = row?.tipo;
            if (typeof v === 'string' && v.trim()) {
              const key = v.trim(); tipoMap[key] = { id: key, label: key, nome: key, tipo: key };
            }
          });
        }
      }
      setTipoById(tipoMap);

      // MÉTODOS: tenta variações id,nome
      let mr = await supabase.from('metodo_pagamento').select('id, nome');
      if (mr.error) mr = await supabase.from('MetodoPagamento').select('id, nome');
      if (mr.error) mr = await supabase.from('metodopagamento').select('id, nome');
      if (mr.error) mr = await supabase.from('metodos_pagamento').select('id, nome');
      if (mr.error) mr = await supabase.from('MetodosPagamento').select('id, nome');
      const mMap = {};
      if (!mr.error) { (mr.data || []).forEach((row) => { mMap[String(row.id)] = { ...row, label: row.nome }; }); }
      setMetodoById(mMap);

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
    const parseDate = (s) => {
      if (!s) return null;
      const str = String(s);
      // espera YYYY-MM-DD
      const parts = str.split('-');
      if (parts.length !== 3) return null;
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return isNaN(d.getTime()) ? null : d;
    };
    const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);
    const inCurrentMonth = (d) => d && d >= startOfMonth && d <= endOfMonth;
    const inNextMonths = (d) => d && d > endOfMonth;
  const inCurrentYear = (d) => d && d >= startOfYear && d <= endOfYear;
    const getValue = (it) => {
      const vParc = Number(it?.valor_parcela);
      const vTot = Number(it?.valor_total);
      if (isFinite(vParc) && vParc > 0) return vParc;
      if (isFinite(vTot) && vTot > 0) return vTot;
      return 0;
    };
    const isEncerrado = (it) => {
      const qt = Number(it?.qtd_parcelas ?? 0);
      const cur = Number(it?.parcela_atual ?? 0);
      return isFinite(qt) && qt > 0 && isFinite(cur) && cur >= qt; // encerrado se atingiu a última parcela
    };
    const isAtivo = (it) => !isEncerrado(it);

    let list = items;
    // Filtro por categorias (múltiplas)
    if (selectedCategories && selectedCategories.length > 0) {
      const setSel = new Set(selectedCategories.map(String));
      list = list.filter((it) => setSel.has((catMap[String(it?.categoria)] || 'Outros')));
    }
    // Filtro de período
    if (period) {
      list = list.filter((it) => {
        const d = parseDate(it?.vencimento_parcela) || parseDate(it?.data_compra);
        if (period === 'mes') return inCurrentMonth(d);
        if (period === 'proximos') return inNextMonths(d);
        if (period === 'anual') return inCurrentYear(d);
        return true;
      });
    }
    // Filtro por intervalo personalizado (combinável com período)
    if ((customStart && customStart.trim()) || (customEnd && customEnd.trim())) {
      const s = parseDate(customStart?.trim());
      const e = parseDate(customEnd?.trim());
      list = list.filter((it) => {
        const d = parseDate(it?.vencimento_parcela) || parseDate(it?.data_compra);
        if (!d) return false;
        if (s && d < s) return false;
        if (e && d > e) return false;
        return true;
      });
    }
    // Filtro de status (combinável)
    if (statusAtivos || statusEncerrados) {
      list = list.filter((it) => {
        const ativo = isAtivo(it);
        const encerrado = !ativo;
        return (statusAtivos && ativo) || (statusEncerrados && encerrado);
      });
    }
    // Ordenação por valor
    if (sortDir === 'asc') {
      list = [...list].sort((a, b) => getValue(a) - getValue(b));
    } else if (sortDir === 'desc') {
      list = [...list].sort((a, b) => getValue(b) - getValue(a));
    }
    return list;
  }, [items, catMap, selectedCategories, sortDir, period, statusAtivos, statusEncerrados, customStart, customEnd]);

  // Lista filtrada sem considerar período (para usar no gráfico quando nenhum período for escolhido)
  const nonDateData = useMemo(() => {
    const getList = () => {
      let list = items || [];
      // Categorias
      if (selectedCategories && selectedCategories.length > 0) {
        const setSel = new Set(selectedCategories.map(String));
        list = list.filter((it) => setSel.has((catMap[String(it?.categoria)] || 'Outros')));
      }
      // Status
      if (statusAtivos || statusEncerrados) {
        const isEncerrado = (it) => {
          const qt = Number(it?.qtd_parcelas ?? 0);
          const cur = Number(it?.parcela_atual ?? 0);
          return isFinite(qt) && qt > 0 && isFinite(cur) && cur >= qt;
        };
        list = list.filter((it) => {
          const ativo = !isEncerrado(it);
          const encerrado = !ativo;
          return (statusAtivos && ativo) || (statusEncerrados && encerrado);
        });
      }
      return list;
    };
    return getList();
  }, [items, catMap, selectedCategories, statusAtivos, statusEncerrados]);

  // Agregação por mês (gráfico): sempre mostrar os 12 meses do ano atual e destacar o mês atual.
  const monthlyChart = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const totals = Array.from({ length: 12 }, () => 0);
    const parseDate = (s) => {
      if (!s) return null;
      const parts = String(s).split('-');
      if (parts.length !== 3) return null;
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return isNaN(d.getTime()) ? null : d;
    };
    const getValue = (it) => {
      const vParc = Number(it?.valor_parcela);
      const vTot = Number(it?.valor_total);
      if (isFinite(vParc) && vParc > 0) return vParc;
      if (isFinite(vTot) && vTot > 0) return vTot;
      return 0;
    };
    // Base: ignora período; aplica filtros de categoria/status (nonDateData)
    (nonDateData || []).forEach((it) => {
      const d = parseDate(it?.vencimento_parcela) || parseDate(it?.data_compra);
      if (!d || d.getFullYear() !== currentYear) return;
      const mi = d.getMonth();
      totals[mi] += getValue(it);
    });
    const labels = Array.from({ length: 12 }, (_, i) => {
      const name = new Date(currentYear, i, 1).toLocaleDateString('pt-BR', { month: 'short' });
      const clean = String(name).replace('.', '');
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    });
    const values = totals;
    const total = values.reduce((a, b) => a + (Number(b) || 0), 0);
    return { labels, values, total, currentMonthIdx };
  }, [nonDateData]);

  // Estatísticas anuais (baseadas no ano corrente e dados filtrados sem recorte de período)
  const yearlyStats = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const parseDate = (s) => {
      if (!s) return null;
      const p = String(s).split('-');
      if (p.length !== 3) return null;
      const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      return isNaN(d.getTime()) ? null : d;
    };
    const getValueTotal = (it) => {
      const vTot = Number(it?.valor_total);
      return isFinite(vTot) && vTot > 0 ? vTot : 0;
    };
    const getValueParcelaOuTotal = (it) => {
      const vParc = Number(it?.valor_parcela);
      const vTot = Number(it?.valor_total);
      if (isFinite(vParc) && vParc > 0) return vParc; // considera parcela como desembolso mensal
      if (isFinite(vTot) && vTot > 0) return vTot; // avulso / sem parcelamento
      return 0;
    };
    let totalAnualComprometido = 0; // soma de valor_total (compromisso integral de cada despesa do ano)
    let totalPagoEstimado = 0; // soma de parcelas já "devidas" até hoje (ou valor_total se não parcelado)
    let totalRestante = 0; // valor_total - (parcela_atual * valor_parcela) para itens parcelados
    let countParcelados = 0;
    (nonDateData || []).forEach((it) => {
      const d = parseDate(it?.vencimento_parcela) || parseDate(it?.data_compra);
      if (!d || d.getFullYear() !== year) return;
      const vTot = getValueTotal(it);
      totalAnualComprometido += vTot;
      const qtd = Number(it?.qtd_parcelas);
      const atual = Number(it?.parcela_atual);
      const vParc = Number(it?.valor_parcela);
      if (isFinite(qtd) && qtd > 0 && isFinite(vParc) && vParc > 0) {
        countParcelados += 1;
        // Estimativa de pago: parcelas já alcançadas (atual pode representar a parcela em andamento) * valor_parcela
        const pago = Math.min(Math.max(0, atual), qtd) * vParc;
        totalPagoEstimado += pago;
        const restante = Math.max(0, vTot - pago);
        totalRestante += restante;
      } else {
        // Não parcelado: considera como totalmente pago no desembolso
        totalPagoEstimado += vTot;
      }
    });
    // Evita inconsistências negativas
    if (totalRestante < 0) totalRestante = 0;
    return {
      ano: year,
      comprometido: totalAnualComprometido,
      pagoEstimado: totalPagoEstimado,
      faltante: Math.max(0, totalRestante),
      parcelados: countParcelados,
    };
  }, [nonDateData]);

  // Centraliza o mês atual no gráfico (dentro do ScrollView) ao montar/atualizar
  const centerCurrentMonthInChart = useCallback(() => {
    try {
      const ref = chartScrollRef.current;
      if (!ref) return;
      const viewportWidth = Math.max(240, chartWidth);
      const totalMonths = monthlyChart.labels.length || 12;
      const contentWidth = Math.max(chartWidth, totalMonths * 64);
      if (contentWidth <= viewportWidth) return; // não precisa rolar
      const slotW = contentWidth / totalMonths;
      const i = Math.min(Math.max(0, monthlyChart.currentMonthIdx || 0), totalMonths - 1);
      const centerX = i * slotW + slotW / 2;
      const targetX = Math.max(0, centerX - viewportWidth / 2);
      // Pequeno delay para garantir layout realizado
      setTimeout(() => {
        ref.scrollTo({ x: targetX, animated: false });
      }, 0);
    } catch {}
  }, [monthlyChart, chartWidth]);

  useEffect(() => {
    centerCurrentMonthInChart();
  }, [centerCurrentMonthInChart]);

  // Estatísticas por categoria para a lista de categorias
  const categoryStats = useMemo(() => {
    const counts = new Map();
    const totals = new Map();
    (items || []).forEach((it) => {
      const name = catMap[String(it?.categoria)] || 'Outros';
      const vParc = Number(it?.valor_parcela);
      const vTot = Number(it?.valor_total);
      const val = (isFinite(vParc) && vParc > 0) ? vParc : (isFinite(vTot) && vTot > 0 ? vTot : 0);
      counts.set(name, (counts.get(name) || 0) + 1);
      totals.set(name, (totals.get(name) || 0) + (isFinite(val) ? val : 0));
    });
    const list = (categorias || []).map((c) => {
      const name = c?.nome || '—';
      return {
        id: c?.id,
        nome: name,
        cor: c?.cor || c?.color || '#9CA3AF',
        icone: c?.icone || c?.icon || 'pricetag-outline',
        count: counts.get(name) || 0,
        total: totals.get(name) || 0,
      };
    });
    // Filtra por busca
    const term = String(searchCat).trim().toLowerCase();
    const filtered = term
      ? list.filter((c) => String(c.nome).toLowerCase().includes(term))
      : list;
    // Ordena por nome
    filtered.sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
    return filtered;
  }, [categorias, items, catMap, searchCat]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar
        title="Despesas"
        right={(
          <View>
            <Pressable
              onPress={() => setFiltersOpen(true)}
              accessibilityLabel="Abrir filtros"
              accessibilityRole="button"
              android_ripple={{ color: '#bbf7d0' }}
              style={({ pressed }) => ([
                {
                  padding: 8,
                  borderRadius: 999,
                  backgroundColor: filtersActive ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.22)',
                },
                pressed && { opacity: 0.9 },
              ])}
            >
              <Ionicons name={filtersActive ? 'funnel' : 'funnel-outline'} size={20} color="#FFFFFF" />
            </Pressable>
            {filtersActive && (
              <View style={{ position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.salmon, borderWidth: 1, borderColor: '#FFFFFF' }} />
            )}
          </View>
        )}
      />
  <Animated.View key={`screen-${focusTick}`} entering={FadeInUp.springify().withInitialValues({ opacity: 0, transform: [{ translateY: 18 }, { scale: 0.985 }] })} layout={Layout.springify()} style={[styles.container, { paddingTop: spacing.md }]}>
    {/* Seletor de modo: Despesas x Categorias */}
  <Animated.View key={`chips-${filterKey}`} entering={FadeInDown.springify().withInitialValues({ opacity: 0, transform: [{ translateY: -8 }] })} layout={Layout.springify()} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <Chip label="Despesas" selected={mode === 'despesas'} onPress={() => setMode('despesas')} />
          <Chip label="Categorias" selected={mode === 'categorias'} onPress={() => setMode('categorias')} />
        </Animated.View>

        {/* Subtítulo dinâmico */}
        {mode === 'despesas' ? (
          <Animated.Text key={`subtitle-${filterKey}`} entering={FadeInDown.delay(40).springify().withInitialValues({ opacity: 0, transform: [{ translateY: -6 }] })} layout={Layout.springify()} style={styles.subtitle}>
            {selectedCategories?.length > 0 ? `Filtrando por: ${selectedCategories[0]}${selectedCategories.length > 1 ? ` +${selectedCategories.length - 1}` : ''} — ` : ''}
            {/* Total carregado: {data.length}{err ? ` — Erro: ${err}` : ''} */}
          </Animated.Text>
        ) : (
          <Animated.Text key={`subtitle-cats-${filterKey}`} entering={FadeInDown.delay(40).springify().withInitialValues({ opacity: 0, transform: [{ translateY: -6 }] })} layout={Layout.springify()} style={styles.subtitle}>Categorias: {categoryStats.length}</Animated.Text>
        )}

      {/* Modal de filtros (modo despesas) */}
      <Modal visible={filtersOpen && mode === 'despesas'} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setFiltersOpen(false)} />
          <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' }}>
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontFamily: 'Poppins_700Bold', fontSize: 18 }}>Filtros</Text>
              <Pressable onPress={() => setFiltersOpen(false)} accessibilityLabel="Fechar filtros" style={{ padding: 6 }}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
              {/* Categoria */}
              <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium', marginBottom: 6 }}>Categorias</Text>
              <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
                <Pressable
                  onPress={() => setSelectedCategories([])}
                  android_ripple={{ color: '#E5E7EB' }}
                  style={({ pressed }) => ([{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: (selectedCategories?.length || 0) > 0 ? '#FFFFFF' : '#ECFDF5' }, pressed && { opacity: 0.96 }])}
                >
                  <Ionicons name="options-outline" size={18} color={'#6B7280'} />
                  <Text style={{ marginLeft: 10, color: colors.text, fontFamily: 'Poppins_400Regular', flex: 1 }}>Todas as categorias</Text>
                  {(selectedCategories?.length || 0) === 0 && <Ionicons name="checkmark" size={16} color={colors.greenDark} />}
                </Pressable>
                {categorias.map((c) => {
                  const selected = (selectedCategories || []).includes(c?.nome);
                  const catColor = c?.cor || c?.color || '#9CA3AF';
                  const catIcon = c?.icone || c?.icon || 'pricetag-outline';
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setSelectedCategories((prev) => {
                          const set = new Set(prev);
                          if (set.has(c.nome)) set.delete(c.nome); else set.add(c.nome);
                          return Array.from(set);
                        });
                      }}
                      android_ripple={{ color: selected ? '#A7F3D0' : '#E5E7EB' }}
                      style={({ pressed }) => ([
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderTopWidth: 1,
                          borderTopColor: '#F3F4F6',
                          backgroundColor: selected ? '#ECFDF5' : '#FFFFFF',
                        },
                        pressed && { opacity: 0.96 },
                      ])}
                    >
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: catColor, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={catIcon} size={14} color={'#FFFFFF'} />
                      </View>
                      <Text style={{ marginLeft: 10, color: colors.text, fontFamily: 'Poppins_400Regular', flex: 1 }} numberOfLines={1}>{c.nome}</Text>
                      <View style={{ paddingHorizontal: 10 }}>
                        <View style={{ width: 28, height: 12, borderRadius: 999, backgroundColor: catColor, borderWidth: selected ? 1 : 0, borderColor: selected ? colors.greenDark : 'transparent' }} />
                      </View>
                      {selected && <Ionicons name="checkmark" size={16} color={colors.greenDark} />}
                    </Pressable>
                  );
                })}
              </View>

              {/* Ordenação */}
              <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium', marginTop: spacing.md, marginBottom: 6 }}>Ordenar por valor</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Chip label="Maior → menor" selected={sortDir === 'desc'} onPress={() => setSortDir(sortDir === 'desc' ? null : 'desc')} />
                <Chip label="Menor → maior" selected={sortDir === 'asc'} onPress={() => setSortDir(sortDir === 'asc' ? null : 'asc')} />
              </View>

              {/* Período */}
              <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium', marginTop: spacing.md, marginBottom: 6 }}>Período</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Chip label="Gastos do mês" selected={period === 'mes'} onPress={() => setPeriod(period === 'mes' ? null : 'mes')} />
                <Chip label="Próximos meses" selected={period === 'proximos'} onPress={() => setPeriod(period === 'proximos' ? null : 'proximos')} />
                <Chip label="Anual" selected={period === 'anual'} onPress={() => setPeriod(period === 'anual' ? null : 'anual')} />
              </View>

              {/* Período personalizado */}
              <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium', marginTop: spacing.md, marginBottom: 6 }}>Período personalizado</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input label="De" value={customStart} onChangeText={setCustomStart} placeholder="YYYY-MM-DD" autoCapitalize="none" autoCorrect={false} keyboardType="numbers-and-punctuation" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Até" value={customEnd} onChangeText={setCustomEnd} placeholder="YYYY-MM-DD" autoCapitalize="none" autoCorrect={false} keyboardType="numbers-and-punctuation" />
                </View>
              </View>

              {/* Status */}
              <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium', marginTop: spacing.md, marginBottom: 6 }}>Status</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Chip label="Gastos ativos" selected={statusAtivos} onPress={() => setStatusAtivos((v) => !v)} />
                <Chip label="Gastos encerrados" selected={statusEncerrados} onPress={() => setStatusEncerrados((v) => !v)} />
              </View>
            </ScrollView>
            {/* Ações no rodapé */}
            <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Button
                label="Limpar"
                variant="secondary"
                onPress={() => { setSelectedCategories([]); setSortDir(null); setPeriod(null); setStatusAtivos(false); setStatusEncerrados(false); setCustomStart(''); setCustomEnd(''); }}
                icon="refresh"
                textStyle={{ fontFamily: 'Poppins_600SemiBold' }}
                style={{ flex: 1 }}
              />
              {Platform.OS === 'android' ? (
                <Pressable
                  onPress={() => setFiltersOpen(false)}
                  accessibilityRole="button"
                  android_ripple={{ color: '#BBF7D0' }}
                  style={({ pressed }) => ([
                    {
                      flex: 1,
                      backgroundColor: colors.green,
                      borderRadius: 16,
                      paddingVertical: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    pressed && { opacity: 0.95 },
                  ])}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold', fontSize: 16 }}>Aplicar</Text>
                  </View>
                </Pressable>
              ) : (
                <Button
                  label="Aplicar"
                  variant="primary"
                  onPress={() => setFiltersOpen(false)}
                  icon="checkmark"
                  iconColor="#FFFFFF"
                  textStyle={{ fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF' }}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Busca de categorias - apenas no modo categorias */}
      {mode === 'categorias' && (
        <View style={{ marginTop: spacing.xs }}>
          <Input label="Buscar categoria" value={searchCat} onChangeText={setSearchCat} placeholder="Digite o nome da categoria" />
        </View>
      )}
      {mode === 'despesas' ? (
  <ScrollView key={`scroll-desp-${filterKey}-${dataSignature}`} contentContainerStyle={{ paddingTop: 12, paddingBottom: spacing.lg }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* Estatísticas anuais em blocos (mini-cards) */}
          <Animated.View key={`stats-${filterKey}-${yearlyStats?.ano || ''}`} entering={FadeInDown.springify().withInitialValues({ opacity: 0, transform: [{ translateY: -8 }] })} layout={Layout.springify()} style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {[
                { key: 'comp', label: 'Dívida anual', value: fmtCurrency(yearlyStats?.comprometido || 0), icon: 'cash-outline' },
                { key: 'pago', label: 'Pago estimado', value: fmtCurrency(yearlyStats?.pagoEstimado || 0), icon: 'checkmark-done-outline' },
                { key: 'falt', label: 'Faltante', value: fmtCurrency(yearlyStats?.faltante || 0), icon: 'time-outline' },
                { key: 'parc', label: 'Parcelados', value: String(yearlyStats?.parcelados || 0), icon: 'calendar-outline' },
                // { key: 'totg', label: 'Total gráfico', value: fmtCurrency(monthlyChart?.total || 0), icon: 'bar-chart-outline' },
              ].map((b, idx) => (
                <Animated.View
                  key={b.key}
                  entering={FadeInDown.delay(40 + idx * 40).springify().withInitialValues({ opacity: 0, transform: [{ translateY: -6 }] })}
                  layout={Layout.springify()}
                  style={{ width: 160 }}
                >
                  <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={b.icon} size={18} color={colors.muted} />
                      <Text style={{ fontFamily: 'Poppins_500Medium', color: colors.muted, flexShrink: 1 }} numberOfLines={1}>{b.label}</Text>
                    </View>
                    <Text style={{ fontFamily: 'Poppins_700Bold', color: colors.text, fontSize: 16, marginTop: 6 }} numberOfLines={1}>{b.value}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
          {/* Gráfico de barras por mês */}
          {(() => {
            const m = new Date().toLocaleDateString('pt-BR', { month: 'long' });
            const monthTitle = m ? (m.charAt(0).toUpperCase() + m.slice(1)) : '';
            return (
              <Animated.View key={`chart-${filterKey}`} entering={FadeInUp.springify().withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })} layout={Layout.springify()}>
                <Card title="Gastos por mês (ano atual)" subtitle={`${monthTitle} — Total: ${fmtCurrency(monthlyChart.total)}`} animateTitlePulse>
                  <ScrollView ref={chartScrollRef} horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 4 }}>
                    <BarChart
                    data={{
                      labels: monthlyChart.labels,
                      datasets: [{
                        data: monthlyChart.values,
                        // Usa paleta do tema: barra normal = verde (#8Db986), destaque = acento (#BADB73)
                        colors: monthlyChart.values.map((_, i) => (opacity = 1) => (
                          i === monthlyChart.currentMonthIdx ? 'rgba(186, 219, 115, 1)' : 'rgba(141, 185, 134, 1)'
                        )),
                      }],
                    }}
                    width={Math.max(chartWidth, monthlyChart.labels.length * 64)}
                    height={220}
                    fromZero
                    yAxisLabel="R$ "
                    withInnerLines={false}
                    showValuesOnTopOfBars={false}
                    verticalLabelRotation={monthlyChart.labels.length > 6 ? 30 : 0}
                    withCustomBarColorFromData={true}
                    flatColor={true}
                    chartConfig={{
                      backgroundGradientFrom: colors.card,
                      backgroundGradientTo: colors.card,
                      decimalPlaces: 2,
                      color: () => colors.green,
                      labelColor: () => colors.muted,
                      barPercentage: 0.6,
                    }}
                    style={{ marginVertical: 8, borderRadius: 12 }}
                    />
                  </ScrollView>
                </Card>
              </Animated.View>
            );
          })()}

          {/* Tabela igual a Home, mas usando 'data' filtrado */}
          <Animated.View key={`table-${filterKey}-${data.length}`} entering={FadeInUp.delay(80).springify().withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })} layout={Layout.springify()}>
            <Card title="Despesas do filtro" subtitle={`Total: ${data.length}`} style={{ marginTop: spacing.md }} animateTitlePulse>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 4 }}>
              <View key={`tbody-${filterKey}-${data.length}`} style={{ width: tableTotalWidth }}>
                {/* Cabeçalho */}
                <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                  <Text style={{ width: nameColW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }}>Despesa</Text>
                  <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }} numberOfLines={2}>Valor{"\n"}Total</Text>
                  <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }}>Categoria</Text>
                  <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }} numberOfLines={2}>Valor{ "\n" }Parcela</Text>
                  <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }} numberOfLines={2}>Qtd{ "\n" }Parcelas</Text>
                  <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }} numberOfLines={2}>Parcela{ "\n" }Atual</Text>
                  <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }}>Tipo</Text>
                  <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }} numberOfLines={2}>Data da{ "\n" }compra</Text>
                  <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }} numberOfLines={2}>Método{ "\n" }Pagamento</Text>
                  <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }} numberOfLines={2}>Criado{ "\n" }Por</Text>
                </View>

                {/* Linhas */}
                {(data && data.length > 0 ? data : []).map((item, idx) => {
                  const catName = catMap[String(item?.categoria)] || 'Outros';
                  const color = (categoryStyleByName[catName]?.color) || '#9CA3AF';
                  const icon = (categoryStyleByName[catName]?.icon) || 'pricetag-outline';
                  return (
                    <Animated.View
                      key={item.id || idx}
                      entering={FadeInUp.springify().damping(16).mass(0.55).delay(100 + idx * 18).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }, { scale: 0.985 }] })}
                      layout={Layout.springify()}
                    >
                      <Pressable
                        onPress={() => navigation.navigate('ItemDetail', { id: item.id, item })}
                        accessibilityRole="button"
                        android_ripple={{ color: '#86EFAC', foreground: false }}
                        style={({ pressed, hovered }) => ([
                          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
                          (pressed || hovered) && { backgroundColor: '#DCFCE7', borderLeftWidth: 4, borderLeftColor: colors.green, transform: [{ scale: 0.992 }] },
                          Platform.OS === 'web' && { cursor: 'pointer' },
                        ])}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                      <View style={{ width: nameColW, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="chevron-forward" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                        <Text style={{ flexShrink: 1, color: colors.text, fontFamily: 'Poppins_400Regular' }}>
                          {item?.nome || item?.descricao || `Despesa #${item.id}`}
                        </Text>
                      </View>
                      <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'right', color: colors.text, fontFamily: 'Poppins_500Medium' }}>
                        {fmtCurrency(item?.valor_total ?? 0)}
                      </Text>
                      <View style={{ width: colW, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={icon} size={16} color={color} />
                        <Text style={{ color: colors.text, fontFamily: 'Poppins_400Regular' }} numberOfLines={1}>
                          {catName}
                        </Text>
                      </View>
                      <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'right', color: colors.text, fontFamily: 'Poppins_400Regular' }}>
                        {item?.valor_parcela != null ? fmtCurrency(item.valor_parcela) : '—'}
                      </Text>
                      <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'right', color: colors.text, fontFamily: 'Poppins_400Regular' }}>
                        {item?.qtd_parcelas != null ? String(item.qtd_parcelas) : '—'}
                      </Text>
                      <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'right', color: colors.text, fontFamily: 'Poppins_400Regular' }}>
                        {item?.parcela_atual != null ? String(item.parcela_atual) : '—'}
                      </Text>
                      <Text style={{ width: colW, paddingHorizontal: spacing.sm, color: colors.text, fontFamily: 'Poppins_400Regular' }} numberOfLines={1}>
                        {(() => {
                          const id = item?.tipo;
                          if (id == null || id === '') return '—';
                          const label = tipoById[String(id)]?.label || tipoById[String(id)]?.nome;
                          if (label) return label;
                          return typeof id === 'string' ? id : `#${id}`;
                        })()}
                      </Text>
                      <Text style={{ width: colW, paddingHorizontal: spacing.sm, color: colors.text, fontFamily: 'Poppins_400Regular' }} numberOfLines={1}>
                        {(() => {
                          const d = item?.data_compra;
                          if (!d) return '—';
                          const parts = String(d).split('-');
                          return parts.length === 3 ? `${parts[2].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[0]}` : String(d);
                        })()}
                      </Text>
                      <Text style={{ width: colW, paddingHorizontal: spacing.sm, color: colors.text, fontFamily: 'Poppins_400Regular' }} numberOfLines={1}>
                        {(() => {
                          const id = item?.metodo_pagamento;
                          if (id == null || id === '') return '—';
                          const label = metodoById[String(id)]?.label || metodoById[String(id)]?.nome;
                          if (label) return label;
                          return typeof id === 'string' ? id : `#${id}`;
                        })()}
                      </Text>
                      <Text style={{ width: colW, paddingHorizontal: spacing.sm, color: colors.text, fontFamily: 'Poppins_400Regular' }} numberOfLines={1}>
                        {item?.created_by ? String(item.created_by) : '—'}
                      </Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}

                {(!data || data.length === 0) && (
                  <View style={{ paddingVertical: 14 }}>
                    <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Sem despesas no filtro atual.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
            </Card>
          </Animated.View>
        </ScrollView>
      ) : (
        <FlatList
          key={`cats-${categoryStats.length}-${searchCat}`}
          data={categoryStats}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item: c, index }) => (
            <Animated.View
              entering={FadeInUp.springify().damping(16).mass(0.55).delay(80 + (index || 0) * 22).withInitialValues({ opacity: 0, transform: [{ translateY: 8 }, { scale: 0.985 }] })}
              layout={Layout.springify()}
            >
              <Pressable
                onPress={() => { setMode('despesas'); setSelectedCategories([c.nome]); }}
                android_ripple={{ color: '#E5E7EB' }}
                style={({ pressed, hovered }) => ([
                  { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' },
                  (pressed || hovered) && { backgroundColor: '#F9FAFB' },
                  Platform.OS === 'web' && { cursor: 'pointer' },
                ])}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.cor, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={c.icone} size={16} color={'#FFFFFF'} />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium' }}>{c.nome}</Text>
                  <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular', marginTop: 2 }}>{c.count} despesa(s)</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ width: 40, height: 14, borderRadius: 999, backgroundColor: c.cor }} />
                </View>
              </Pressable>
            </Animated.View>
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: spacing.lg }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
  </Animated.View>
    </View>
  );
}

// estilos movidos para styles/screens/ItemListScreen.styles.js
