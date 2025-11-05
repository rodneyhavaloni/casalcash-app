import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, Pressable, Platform, Vibration } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Header from '../components/Header';
import Card from '../components/Card';
import Button from '../components/Button';
import { colors, spacing, typography, radii } from '../components/theme';
import styles from '../styles/screens/HomeScreen.style';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
// Cancelamos predefinição de ícones/cores para categorias: passamos a usar o que vier do banco (Categoria.cor/icone)
import { supabase } from '../services/supabaseClient';
import { getAISuggestion } from '../utils/aiSuggestions';
const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [metasRows, setMetasRows] = useState([]);
  const [saldo, setSaldo] = useState(0);
  const [gastosMes, setGastosMes] = useState(0);
  const [gastosProxMes, setGastosProxMes] = useState(0);
  const [metasAtivas, setMetasAtivas] = useState(3);
  const [metasPct, setMetasPct] = useState(0);
  const [recentItems, setRecentItems] = useState([]);
  const [pieData, setPieData] = useState([]); // legacy (agora não usado no UI)
  const [pieDataPessoal, setPieDataPessoal] = useState([]);
  const [pieDataCompart, setPieDataCompart] = useState([]);
  const [totalPessoal, setTotalPessoal] = useState(0);
  const [totalCompart, setTotalCompart] = useState(0);
  const [catMap, setCatMap] = useState({});
  const [tipoMap, setTipoMap] = useState({}); // id -> nome do tipo (coluna 'tipo')
  const [metodoMap, setMetodoMap] = useState({}); // id -> nome do método (coluna 'nome')
  const [debug, setDebug] = useState({ cats: 0, month: 0, recent: 0, lastError: null, supaUrl: '', user: '' });
  const chartSize = Math.max(140, Math.min(220, screenWidth - 80));
  // Animação de entrada da tela e gráficos
  const enter = useSharedValue(0);
  const chartsProgress = useSharedValue(0);
  // Números animados dos primeiros cards
  const [animGastosMes, setAnimGastosMes] = useState(0);
  const [animGastosProxMes, setAnimGastosProxMes] = useState(0);
  const [animSaldo, setAnimSaldo] = useState(0);
  const [animMetasPct, setAnimMetasPct] = useState(0);

  // Helper genérico para animar valores numéricos com requestAnimationFrame
  const animateFromTo = (from, to, setter, duration = 700) => {
    const start = Date.now();
    const d = Math.max(1, duration);
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
    let rafId;
    const loop = () => {
      const p = Math.min(1, (Date.now() - start) / d);
      const eased = easeOutCubic(p);
      const v = from + (to - from) * eased;
      setter(v);
      if (p < 1) rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => rafId && cancelAnimationFrame(rafId);
  };
  

  // Helpers de formatação (pt-BR)
  const fmtCurrency = (n) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n || 0));
  const fmtPercent = (n) =>
    `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(Number(n || 0))}%`;

  // Formatação adaptável para o SALDO
  // Regras:
  // - < 10.000: manter duas casas decimais (ex.: R$ 1.234,00)
  // - ≥ 10.000 e < 1.000.000: remover decimais se for .00 (ex.: R$ 15.982)
  // - ≥ 1.000.000: usar sufixo M; se inteiro em milhões, sem casas (R$ 2M), senão 1 casa (R$ 1,2M)
  const fmtCurrencyAdaptive = (n) => {
    const v = Number(n || 0);
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);
    if (abs < 10_000) {
      return sign + new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs);
    }
    if (abs < 1_000_000) {
      // mostra sem decimais
      return sign + new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(abs);
    }
    const m = abs / 1_000_000;
    const isIntM = Number.isInteger(m);
    const formattedM = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: isIntM ? 0 : 1,
      maximumFractionDigits: isIntM ? 0 : 1,
    }).format(m);
    return `${sign}R$ ${formattedM}M`;
  };

  // Alias para compatibilidade com hot reload/uso anterior
  const fmtCurrencyCompact = fmtCurrencyAdaptive;

  // Estilos animados
  const overlayAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: enter.value * screenHeight }],
  }));
  const contentAnim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 12 }],
  }));
  const chartGrowX = useAnimatedStyle(() => ({
    transform: [{ scaleX: chartsProgress.value }],
    transformOrigin: 'left',
  }));

  useFocusEffect(
    React.useCallback(() => {
      // Reinicia valores toda vez que a tela ganha foco
      enter.value = 0;
      chartsProgress.value = 0;
      // Reinicia contadores visuais
      setAnimGastosMes(0);
      setAnimGastosProxMes(0);
      setAnimSaldo(0);
      setAnimMetasPct(0);

      // Animação por RAF para números "escrevendo"
      const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
      const animate = (toValue, setter, duration = 800) => {
        let start = null;
        let req = null;
        const loop = (ts) => {
          if (start === null) start = ts;
          const p = Math.min(1, (ts - start) / duration);
          const eased = easeOutCubic(p);
          setter(toValue * eased);
          if (p < 1) req = requestAnimationFrame(loop);
        };
        req = requestAnimationFrame(loop);
        return () => req && cancelAnimationFrame(req);
      };

  const t = setTimeout(() => {
        enter.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
        chartsProgress.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic), delay: 200 });

        // Dispara as contagens dos cards com durações levemente diferentes
  const cancels = [];
  cancels.push(animate(Number(gastosMes || 0), setAnimGastosMes, 700));
  cancels.push(animate(Number(gastosProxMes || 0), setAnimGastosProxMes, 700));
  cancels.push(animate(Number(saldo || 0), setAnimSaldo, 800));
  cancels.push(animate(Number(metasPct || 0), setAnimMetasPct, 900));

        // Cleanup parcial para os RAFs caso o foco mude rapidamente
        // Guardamos em ref local via closure
        // Retornamos na cleanup do focus effect abaixo
        (focusCleanup.cancels = cancels);
      }, 0);
      const focusCleanup = { cancels: [] };
      return () => {
        clearTimeout(t);
        focusCleanup.cancels.forEach((c) => c && c());
      };
    }, [gastosMes, gastosProxMes, saldo, metasPct])
  );

  // Reage a mudanças reais dos valores base (quando chegam do Supabase) animando até o novo alvo
  useEffect(() => {
    const to = Number(gastosMes || 0);
    const from = Number(animGastosMes || 0);
    if (isFinite(to) && to !== from) animateFromTo(from, to, setAnimGastosMes, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastosMes]);

  useEffect(() => {
    const to = Number(gastosProxMes || 0);
    const from = Number(animGastosProxMes || 0);
    if (isFinite(to) && to !== from) animateFromTo(from, to, setAnimGastosProxMes, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastosProxMes]);

  useEffect(() => {
    const to = Number(saldo || 0);
    const from = Number(animSaldo || 0);
    if (isFinite(to) && to !== from) animateFromTo(from, to, setAnimSaldo, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saldo]);

  useEffect(() => {
    const to = Number(metasPct || 0);
    const from = Number(animMetasPct || 0);
    if (isFinite(to) && to !== from) animateFromTo(from, to, setAnimMetasPct, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metasPct]);

  // Ícone/Cor agora são definidos pelo usuário ao criar a categoria; sem heurísticas aqui

  // Autenticação (carrega usuário)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
      setDebug((d) => ({ ...d, user: data?.user?.email || data?.user?.id || '' }));
    })();
  }, []);

  // Carrega mapas de Tipo (coluna 'tipo') e Método de Pagamento (coluna 'nome')
  useEffect(() => {
    (async () => {
      try {
        // TIPOS: usa a tabela oficial "tipo de despesa" (com espaço) e variações de fallback
        const tryTipo = async () => {
          const map = {};

          const tables = ['tipo de despesa'];

          // 1) Tenta buscar com coluna 'tipo'
          for (const t of tables) {
            const r = await supabase.from(t).select('id, tipo');
            if (!r.error) {
              (r.data || []).forEach((row) => {
                if (row && row.id != null && row.tipo != null) {
                  map[String(row.id)] = row.tipo;
                }
              });
              if (Object.keys(map).length) break;
            }
          }

          // 2) Se não preencheu, tenta com coluna 'nome'
          if (!Object.keys(map).length) {
            for (const t of tables) {
              const r = await supabase.from(t).select('id, nome');
              if (!r.error) {
                (r.data || []).forEach((row) => {
                  if (row && row.id != null && row.nome != null) {
                    map[String(row.id)] = row.nome;
                  }
                });
                if (Object.keys(map).length) break;
              }
            }
          }

          // 3) Fallback: se o campo 'tipo' na tabela de despesas já for textual, cria um mapa identidade
          if (!Object.keys(map).length) {
            let dr = await supabase.from('Despesas').select('tipo');
            if (dr.error) {
              dr = await supabase.from('despesas').select('tipo');
            }
            if (!dr.error) {
              (dr.data || []).forEach((row) => {
                const v = row?.tipo;
                if (typeof v === 'string' && v.trim()) {
                  const key = v.trim();
                  map[key] = key;
                }
              });
            }
          }

          setTipoMap(map);
        };

        // MÉTODOS DE PAGAMENTO: tenta variações com colunas id,nome
        const tryMetodo = async () => {
          let r = await supabase.from('metodo_pagamento').select('id, nome');
          if (r.error) r = await supabase.from('MetodoPagamento').select('id, nome');
          if (r.error) r = await supabase.from('metodopagamento').select('id, nome');
          if (r.error) r = await supabase.from('metodos_pagamento').select('id, nome');
          if (r.error) r = await supabase.from('MetodosPagamento').select('id, nome');
          if (r.error) throw r.error;
          const map = {};
          (r.data || []).forEach((row) => { map[String(row.id)] = row.nome; });
          setMetodoMap(map);
        };

        await Promise.all([tryTipo(), tryMetodo()]);
      } catch (e) {
        console.warn('Falha ao carregar tipos/métodos:', e?.message || e);
        setDebug((d) => ({ ...d, lastError: String(e?.message || e) }));
      }
    })();
  }, []);

  // Carrega categorias e monta mapa id->nome e nome->cor/icone (preferindo dados do banco)
  useEffect(() => {
    (async () => {
      try {
        let res = await supabase.from('categoria').select('id, nome, cor, icone');
        if (res.error) {
          res = await supabase.from('Categoria').select('id, nome, cor, icone');
        }
        if (res.error) throw res.error;
        const map = {};
        const styleByName = {};
        (res.data || []).forEach((c) => {
          map[String(c.id)] = c.nome;
          const color = c.cor || c.color || null;
          const icon = c.icone || c.icon || null;
          if (c.nome) styleByName[String(c.nome)] = { color, icon };
        });
        setCatMap(map);
        setCategoryStyleByName(styleByName);
        setDebug((d) => ({ ...d, cats: (res.data || []).length }));
      } catch (e) {
        console.warn('Falha ao carregar categorias:', e?.message || e);
        setCatMap({});
        setCategoryStyleByName({});
        setDebug((d) => ({ ...d, lastError: String(e?.message || e) }));
      }
    })();
  }, []);

  // Monta os gráficos (Pessoal e Compartilhada) a partir de Despesas (mês atual) agregando por categoria
  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const fmt = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        let { data, error } = await supabase
          .from('Despesas')
          .select('id, valor_total, valor_parcela, vencimento_parcela, categoria, tipo')
          .gte('vencimento_parcela', fmt(start))
          .lte('vencimento_parcela', fmt(end));
        if (error) {
          ({ data, error } = await supabase
            .from('despesas')
            .select('id, valor_total, valor_parcela, vencimento_parcela, categoria, tipo')
            .gte('vencimento_parcela', fmt(start))
            .lte('vencimento_parcela', fmt(end)));
        }
        if (error) throw error;

  const totalsPessoal = new Map();
  const totalsCompart = new Map();
  let sumPessoal = 0;
  let sumCompart = 0;
        let totalMes = 0;
        const rows = data || [];
        console.log('[Home] despesas mês carregadas:', rows.length);
        rows.forEach((row) => {
          const vParc = Number(row?.valor_parcela);
          const vTot = Number(row?.valor_total);
          const val = (isFinite(vParc) && vParc > 0)
            ? vParc
            : (isFinite(vTot) && vTot > 0 ? vTot : 0);
          if (!isFinite(val) || val <= 0) return;
          totalMes += val;
          const nomeCat = catMap[String(row?.categoria)] || 'Outros';
          // Normaliza o tipo (pode ser id numérico ou string)
          const tRaw = row?.tipo;
          let tName = '';
          if (tRaw != null) {
            if (typeof tRaw === 'string') tName = tRaw;
            else tName = tipoMap[String(tRaw)] || '';
          }
          const tLower = String(tName).toLowerCase();
          const isCompart = /compartilh/.test(tLower);
          if (isCompart) {
            totalsCompart.set(nomeCat, (totalsCompart.get(nomeCat) || 0) + val);
            sumCompart += val;
          } else {
            // default vai para pessoal (inclui "pessoal" explícito e desconhecidos)
            totalsPessoal.set(nomeCat, (totalsPessoal.get(nomeCat) || 0) + val);
            sumPessoal += val;
          }
        });

        const toPie = (map) => {
          return Array.from(map.entries())
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value], idx) => ({
              name,
              value,
              color: (categoryStyleByName[name]?.color) || '#E5E7EB',
              legendFontColor: colors.text,
              legendFontSize: 12,
            }));
        };

        const piePessoal = toPie(totalsPessoal);
        const pieCompart = toPie(totalsCompart);

        setPieDataPessoal(piePessoal);
        setPieDataCompart(pieCompart);
  setTotalPessoal(sumPessoal);
  setTotalCompart(sumCompart);
        setGastosMes(totalMes);
        setDebug((d) => ({ ...d, month: rows.length }));
      } catch (e) {
        console.warn('Falha ao montar gráfico por categoria (Despesas):', e?.message || e);
        setPieDataPessoal([]);
        setPieDataCompart([]);
        setDebug((d) => ({ ...d, lastError: String(e?.message || e) }));
      }
    })();
  }, [catMap, tipoMap]);

  // Calcula gastos do próximo mês (considera parcelas programadas para cair no próximo mês)
  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        const fmt = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };
        // Helpers
        const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
        const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
        const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

        // Buscamos despesas com vencimento até o fim do próximo mês
        let { data, error } = await supabase
          .from('Despesas')
          .select('valor_total, valor_parcela, vencimento_parcela, qtd_parcelas, parcela_atual, data_compra')
          .lte('vencimento_parcela', fmt(end));
        if (error) {
          ({ data, error } = await supabase
            .from('despesas')
            .select('valor_total, valor_parcela, vencimento_parcela, qtd_parcelas, parcela_atual, data_compra')
            .lte('vencimento_parcela', fmt(end)));
        }
        if (error) throw error;

        const rows = data || [];
        let total = 0;
        const startNext = start; // início do próximo mês
        const endNext = end;     // fim do próximo mês

        rows.forEach((r) => {
          const qt = Number(r?.qtd_parcelas ?? 0);
          const cur = Number(r?.parcela_atual ?? 1);
          const hasParcelas = isFinite(qt) && qt > 1;
          const vParc = Number(r?.valor_parcela ?? 0);
          const vTot = Number(r?.valor_total ?? 0);
          const vEach = isFinite(vParc) && vParc > 0 ? vParc : (isFinite(vTot) && qt > 0 ? vTot / qt : vTot);
          const vencStr = r?.vencimento_parcela ? String(r.vencimento_parcela) : '';
          const venc = vencStr ? new Date(vencStr + 'T00:00:00') : null;

          // Caso sem parcelas definidas (ou parcela única): conta se o vencimento cai no próximo mês
          if (!hasParcelas) {
            if (venc && venc >= startNext && venc <= endNext) {
              if (isFinite(vEach) && vEach > 0) total += vEach;
            }
            return;
          }

          // Com parcelas: assumimos que vencimento_parcela corresponde a parcela_atual
          if (!venc) return; // sem referência de data, não conseguimos projetar
          const baseMonth = startOfMonth(venc);
          const k = monthsBetween(baseMonth, startNext); // quantos meses depois cai o início do próximo mês
          if (k < 0) return; // próximo mês é antes do primeiro vencimento conhecido (incomum), ignora
          const parcelaNoProxMes = cur + k;
          if (parcelaNoProxMes >= 1 && parcelaNoProxMes <= qt) {
            // Existe parcela no próximo mês
            if (isFinite(vEach) && vEach > 0) total += vEach;
          }
        });

        setGastosProxMes(total);
      } catch (e) {
        console.warn('Falha ao calcular gastos do próximo mês:', e?.message || e);
        setGastosProxMes(0);
      }
    })();
  }, []);

  // Busca metas na tabela 'metas' e calcula:
  //  - Saldo total = SUM(saldo_avanco)
  //  - % metas = SUM(saldo_avanco) / SUM(valor) * 100
  // Assumindo colunas: id, nome, valor, saldo_avanco
  useEffect(() => {
    (async () => {
      try {
        // Seleção explícita das colunas necessárias
        const res = await supabase
          .from('metas')
          .select('id, nome, valor, saldo_avanco');
        if (res.error) throw res.error;
        const rows = res.data || [];

        let sumSaldo = 0;
        let sumValor = 0;
        rows.forEach((row) => {
          const s = Number(row && row.saldo_avanco != null ? row.saldo_avanco : 0);
          const v = Number(row && row.valor != null ? row.valor : 0);
          if (isFinite(s)) sumSaldo += s;
          if (isFinite(v)) sumValor += v;
        });

  setMetasRows(rows);
  setSaldo(sumSaldo);
        const pct = sumValor > 0 ? (sumSaldo / sumValor) * 100 : 0;
        setMetasPct(pct);
      } catch (e) {
        console.warn("Falha ao carregar 'metas' para saldo/%:", e?.message || e);
        setSaldo(0);
        setMetasPct(0);
        setMetasRows([]);
      }
    })();
  }, []);

  // Dados do gráfico de Metas (Guardado vs Restante) - sem Hook, para evitar conflitos
  const metasChart = (() => {
    const rows = metasRows || [];
    const labels = [];
    const data = [];
    rows.forEach((r) => {
      const nome = String(r?.nome || 'Meta');
      labels.push(nome);
      const valor = Number(r?.valor || 0);
      const saldo = Number(r?.saldo_avanco || 0);
      const restante = Math.max(0, valor - saldo);
      data.push([saldo, restante]);
    });
    return {
      labels,
      legend: ['Guardado', 'Restante'],
      data,
      barColors: [colors.green, '#E5E7EB'],
    };
  })();

  // Mapa de cores e ícones por categoria (sincronizado com o pieData dinâmico)
  // Para colorir categorias na tabela, use união dos dois gráficos
  const categoryColorMap = ([...(pieDataPessoal || []), ...(pieDataCompart || [])]).reduce((acc, cur) => {
    acc[cur.name] = cur.color;
    return acc;
  }, {});

  const categoryIcons = {
    Alimentação: 'fast-food-outline',
    Casa: 'home-outline',
    Lazer: 'happy-outline',
    Transporte: 'car-outline',
    Outros: 'pricetag-outline',
  };

  // Estado com estilo por nome de categoria obtido do banco
  const [categoryStyleByName, setCategoryStyleByName] = useState({});

  useEffect(() => {
    (async () => {
      try {
        // Busca despesas mais recentes (sem join) e usamos catMap para mostrar nome da categoria
        let { data, error } = await supabase
          .from('Despesas')
          .select('id, nome, descricao, valor_total, valor_parcela, qtd_parcelas, parcela_atual, tipo, data_compra, vencimento_parcela, metodo_pagamento, created_by, categoria')
          .order('vencimento_parcela', { ascending: false })
          .limit(20);
        if (error) {
          ({ data, error } = await supabase
            .from('despesas')
            .select('id, nome, descricao, valor_total, valor_parcela, qtd_parcelas, parcela_atual, tipo, data_compra, vencimento_parcela, metodo_pagamento, created_by, categoria')
            .order('vencimento_parcela', { ascending: false })
            .limit(20));
        }
        if (error) throw error;
        const rows = data || [];
        console.log('[Home] despesas recentes carregadas:', rows.length);
        setRecentItems(rows);
        setDebug((d) => ({ ...d, recent: rows.length }));
      } catch (e) {
        console.warn('Falha ao carregar despesas recentes:', e?.message || e);
        setRecentItems([]);
        setDebug((d) => ({ ...d, lastError: String(e?.message || e) }));
      }
    })();
  }, []);

  const suggestion = getAISuggestion(gastosMes);
  const cardWidth = screenWidth - spacing.lg * 2; // largura útil dentro do Card
  const triggerHaptic = () => {
    try {
      // Tenta um feedback leve; se falhar (web/ambiente sem haptics), usa Vibration curta
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Haptics.selectionAsync();
      } else {
        Vibration.vibrate(10);
      }
    } catch {
      Vibration.vibrate(10);
    }
  };
  // Todas as colunas com largura equivalente a ~9 caracteres
  const approxCharPx = 8; // aproximação por caractere (depende da fonte/tamanho)
  const colW = 9 * approxCharPx + spacing.sm * 2; // inclui padding lateral para manter 9 "chars" úteis
  const totalCols = 10;
  const tableTotalWidth = colW * totalCols;
  const sideChartSize = Math.max(120, Math.min(180, Math.floor((screenWidth - 80) * 0.5)));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
  <Header title={`Olá, ${user?.user_metadata?.full_name || 'Casal'}`} subtitle="Rodney & Mariana" />
  <Animated.ScrollView contentContainerStyle={styles.content} style={contentAnim}>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Pressable
              onPress={() => navigation.navigate('DebtProjection', { scope: 'current-month' })}
              android_ripple={{ color: '#BBF7D0' }}
              accessibilityRole="button"
              accessibilityLabel="Abrir projeção de dívidas do mês atual"
              style={({ pressed, hovered }) => ([
                hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }], elevation: 6 },
                pressed && {
                  opacity: 0.95,
                  transform: [{ scale: 0.96 }, { translateY: 1 }],
                  shadowColor: '#000',
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                  borderRadius: 16,
                },
              ])}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Card title="Mês atual" right={<Ionicons name="trending-up" size={20} color={colors.salmonDark} />}>
                  <Text style={[styles.value, { color: colors.salmonDark }]}>{fmtCurrency(animGastosMes)}</Text>
              </Card>
            </Pressable>
          </View>
          <View style={styles.gridItem}>
            <Pressable
              onPress={() => navigation.navigate('DebtProjection', { scope: 'next-month' })}
              android_ripple={{ color: '#BBF7D0' }}
              accessibilityRole="button"
              accessibilityLabel="Abrir projeção de dívidas do próximo mês"
              style={({ pressed, hovered }) => ([
                hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }], elevation: 6 },
                pressed && {
                  opacity: 0.95,
                  transform: [{ scale: 0.96 }, { translateY: 1 }],
                  shadowColor: '#000',
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                  borderRadius: 16,
                },
              ])}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Card title="Próximo mês" right={<Ionicons name="calendar-outline" size={20} color={colors.salmonDark} />}>
                  <Text style={[styles.value, { color: colors.salmonDark }]}>{fmtCurrency(animGastosProxMes)}</Text>
              </Card>
            </Pressable>
          </View>
        </View>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Pressable
              onPress={() => navigation.navigate('GoalsDashboard', { from: 'saldo' })}
              android_ripple={{ color: '#BBF7D0' }}
              accessibilityRole="button"
              accessibilityLabel="Abrir dashboard de metas a partir do saldo total"
              style={({ pressed, hovered }) => ([
                hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }], elevation: 6 },
                pressed && {
                  opacity: 0.95,
                  transform: [{ scale: 0.96 }, { translateY: 1 }],
                  shadowColor: '#000',
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                  borderRadius: 16,
                },
              ])}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Card title="Saldo total" right={<Ionicons name="wallet" size={20} color={colors.greenDark} />}>
                <Text style={styles.value}>{fmtCurrencyAdaptive(animSaldo)}</Text>
              </Card>
            </Pressable>
          </View>
          <View style={styles.gridItem}>
            <Pressable
              onPress={() => navigation.navigate('GoalsDashboard', { from: 'metas' })}
              android_ripple={{ color: '#BBF7D0' }}
              accessibilityRole="button"
              accessibilityLabel="Abrir dashboard de metas"
              style={({ pressed, hovered }) => ([
                hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }], elevation: 6 },
                pressed && {
                  opacity: 0.95,
                  transform: [{ scale: 0.96 }, { translateY: 1 }],
                  shadowColor: '#000',
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                  borderRadius: 16,
                },
              ])}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Card title="Metas" right={<Ionicons name="trophy" size={20} color={colors.greenDark} />}>
                <Text style={[styles.value, { color: colors.greenDark }]}>{fmtPercent(animMetasPct)}</Text>
              </Card>
            </Pressable>
          </View>
        </View>

        <Card title="Metas: Guardado vs Restante" style={{ marginBottom: spacing.md }}>
          {metasChart && metasChart.labels.length > 0 ? (
            <View style={{ width: '100%' }}>
              {metasChart.labels.map((label, i) => {
                const pair = metasChart.data[i] || [0, 0];
                const guardado = Number(pair[0] || 0);
                const restante = Number(pair[1] || 0);
                const total = guardado + restante;
                const guardPct = total > 0 ? guardado / total : 0;
                const restPct = total > 0 ? restante / total : 0;
                const guardPctPercent = guardPct * 100;
                const showInlineInRest = restPct > 0.12; // mostra % dentro da área cinza quando houver espaço
                const goalId = metasRows?.[i]?.id;
                return (
                  <Pressable
                    key={`${label}-${i}`}
                    onPress={() => navigation.navigate('Metas', { goalId, goalName: label })}
                    android_ripple={{ color: '#BBF7D0' }}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir meta ${label}`}
                    style={({ pressed }) => ([
                      { marginBottom: 12, borderRadius: 8 },
                      pressed && { opacity: 0.96, backgroundColor: '#ECFDF5', padding: 4, transform: [{ scale: 0.985 }, { translateY: 1 }] },
                    ])}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: colors.text, fontFamily: 'Poppins_500Medium' }} numberOfLines={1}>{label}</Text>
                    </View>
                    <Animated.View style={[{ height: 26, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', flexDirection: 'row' }, chartGrowX]}>
                      {/* Segmento Guardado */}
                      <View style={{ width: `${guardPct * 100}%`, backgroundColor: colors.green, justifyContent: 'center', paddingHorizontal: 6 }}>
                        {/* sem números aqui; só % no bloco Restante (cinza) */}
                      </View>
                      {/* Segmento Restante */}
                      <View style={{ flex: 1, backgroundColor: '#D1D5DB', justifyContent: 'center', paddingHorizontal: 6, alignItems: showInlineInRest ? 'flex-end' : 'flex-start' }}>
                        {showInlineInRest && (
                          <Text style={{ color: colors.green, fontFamily: 'Poppins_700Bold', fontSize: 14 }}>{fmtPercent(guardPctPercent)}</Text>
                        )}
                      </View>
                    </Animated.View>
                    {/* Fallback: se não houver espaço na área cinza (restante muito pequeno), coloca a % abaixo, à direita, em verde */}
                    {!showInlineInRest && (
                      <View style={{ marginTop: 4, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline' }}>
                        <Text style={{ color: colors.green, fontFamily: 'Poppins_700Bold', fontSize: 14 }}>{fmtPercent(guardPctPercent)}</Text>
                        <Text style={{ color: colors.green, fontFamily: 'Poppins_400Regular', marginLeft: 4 }}>guardado</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Sem metas cadastradas.</Text>
          )}
        </Card>


        <Card title="Despesas pessoais do mês" style={{ marginTop: spacing.md }}>
          {pieDataPessoal && pieDataPessoal.length > 0 ? (
            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                {pieDataPessoal.map((p, idx) => (
                  <Pressable
                    key={`${p.name}-${idx}`}
                    onPress={() => navigation.navigate('Itens', { filterCategoryName: p.name })}
                    android_ripple={{ color: '#00000022' }}
                    style={({ pressed }) => ([
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        backgroundColor: p.color,
                        borderRadius: radii.pill,
                        paddingVertical: 6,
                        paddingLeft: 14,
                        paddingRight: 10,
                        marginBottom: 8,
                      },
                      pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] },
                    ])}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name={(categoryStyleByName[p.name]?.icon) || 'pricetag-outline'} size={14} color={'#FFFFFF'} />
                    <Text style={{ marginLeft: 6, color: '#FFFFFF', fontFamily: 'Poppins_400Regular' }}>{p.name}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingLeft: 12 }}>
                <Pressable
                  onPress={() => navigation.navigate('Itens')}
                  android_ripple={{ color: '#BBF7D0' }}
                  accessibilityRole="button"
                  style={({ pressed }) => ([ pressed && { opacity: 0.95, transform: [{ scale: 0.97 }, { translateY: 1 }] } ])}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                <PieChart
                  data={pieDataPessoal.map(p => ({ name: p.name, population: p.value, color: p.color, legendFontColor: p.legendFontColor, legendFontSize: p.legendFontSize }))}
                  width={sideChartSize}
                  height={sideChartSize}
                  chartConfig={{
                    color: () => '#0F172A',
                    labelColor: () => 'transparent',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 0,
                  }}
                  accessor={'population'}
                  backgroundColor={'transparent'}
                  paddingLeft={'24'}
                  hasLegend={false}
                  absolute={false}
                  center={[12, 0]}
                  style={{ overflow: 'visible', alignSelf: 'center', marginLeft: 4 }}
                />
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Sem dados para o mês atual.</Text>
          )}
          {pieDataPessoal && pieDataPessoal.length > 0 && (
            <View style={{ paddingTop: 6, alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>Total: {fmtCurrency(totalPessoal)}</Text>
            </View>
          )}
        </Card>

        <Card title="Despesas compartilhadas do mês" style={{ marginTop: spacing.md }}>
          {pieDataCompart && pieDataCompart.length > 0 ? (
            <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                {pieDataCompart.map((p, idx) => (
                  <Pressable
                    key={`${p.name}-${idx}`}
                    onPress={() => navigation.navigate('Itens', { filterCategoryName: p.name })}
                    android_ripple={{ color: '#00000022' }}
                    style={({ pressed }) => ([
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        backgroundColor: p.color,
                        borderRadius: radii.pill,
                        paddingVertical: 6,
                        paddingLeft: 14,
                        paddingRight: 10,
                        marginBottom: 8,
                      },
                      pressed && { opacity: 0.9, transform: [{ scale: 0.96 }] },
                    ])}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name={(categoryStyleByName[p.name]?.icon) || 'pricetag-outline'} size={14} color={'#FFFFFF'} />
                    <Text style={{ marginLeft: 6, color: '#FFFFFF', fontFamily: 'Poppins_400Regular' }}>{p.name}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingLeft: 12 }}>
                <Pressable
                  onPress={() => navigation.navigate('Itens')}
                  android_ripple={{ color: '#BBF7D0' }}
                  accessibilityRole="button"
                  style={({ pressed }) => ([ pressed && { opacity: 0.95, transform: [{ scale: 0.97 }, { translateY: 1 }] } ])}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                <PieChart
                  data={pieDataCompart.map(p => ({ name: p.name, population: p.value, color: p.color, legendFontColor: p.legendFontColor, legendFontSize: p.legendFontSize }))}
                  width={sideChartSize}
                  height={sideChartSize}
                  chartConfig={{
                    color: () => '#0F172A',
                    labelColor: () => 'transparent',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 0,
                  }}
                  accessor={'population'}
                  backgroundColor={'transparent'}
                  paddingLeft={'24'}
                  hasLegend={false}
                  absolute={false}
                  center={[12, 0]}
                  style={{ overflow: 'visible', alignSelf: 'center', marginLeft: 4 }}
                />
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Sem dados para o mês atual.</Text>
          )}
          {pieDataCompart && pieDataCompart.length > 0 && (
            <View style={{ paddingTop: 6, alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>Total: {fmtCurrency(totalCompart)}</Text>
            </View>
          )}
        </Card>

        {/* Debug removido para limpar a tela */}

        {/* Bloco separado: Tabela de lançamentos */}
  <Card title="Despesas recentes" subtitle={`Total: ${recentItems?.length || 0}`} style={{ marginTop: spacing.md }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 4 }}>
            <View style={{ width: tableTotalWidth }}>
              {/* Cabeçalho */}
              <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                <Text style={{ width: colW, paddingHorizontal: spacing.sm, textAlign: 'center', fontFamily: 'Poppins_600SemiBold', color: colors.text }}>Despesa</Text>
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
              {(recentItems && recentItems.length > 0 ? recentItems : [])
                .map((item, idx) => {
                  const catName = catMap[String(item?.categoria)] || 'Outros';
                  const color = categoryColorMap[catName] || colors.green;
                  const icon = (categoryStyleByName[catName]?.icon) || 'pricetag-outline';
                  return (
                    <Pressable
                      key={item.id || idx}
                      onPressIn={triggerHaptic}
                      onPress={() => navigation.navigate('ItemDetail', { id: item.id, item })}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir detalhes da despesa ${item?.nome || item?.descricao || item?.id}`}
                      android_ripple={{ color: '#86EFAC', foreground: false }}
                      style={({ pressed, hovered }) => ([
                        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
                        (pressed || hovered) && {
                          backgroundColor: '#DCFCE7', // verde mais visível
                          borderLeftWidth: 4,
                          borderLeftColor: colors.green,
                          transform: [{ scale: 0.992 }],
                        },
                        Platform.OS === 'web' && { cursor: 'pointer' },
                      ])}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <View style={{ width: colW, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="chevron-forward" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                        <Text style={{ flexShrink: 1, color: colors.text, fontFamily: 'Poppins_400Regular' }} numberOfLines={1}>
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
                          // Se já vier como texto, exibe diretamente (ou mapeia por chave textual)
                          if (typeof id === 'string') {
                            const t = id.trim();
                            if (!t) return '—';
                            return tipoMap[t] || t;
                          }
                          // Caso numérico, tenta mapear por id
                          const nome = tipoMap[String(id)];
                          return nome || `#${id}`;
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
                          if (id == null) return '—';
                          const nome = metodoMap[String(id)];
                          return nome || `#${id}`;
                        })()}
                      </Text>
                      <Text style={{ width: colW, paddingHorizontal: spacing.sm, color: colors.text, fontFamily: 'Poppins_400Regular' }} numberOfLines={1}>
                        {item?.created_by ? String(item.created_by) : '—'}
                      </Text>
                    </Pressable>
                  );
                })}

              {(!recentItems || recentItems.length === 0) && (
                <View style={{ paddingVertical: 14 }}>
                  <Text style={{ color: colors.muted, fontFamily: 'Poppins_400Regular' }}>Sem despesas ainda.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Card>
      </Animated.ScrollView>

      {/* Overlay verde descendo na abertura */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: screenHeight,
            backgroundColor: colors.green,
          },
          overlayAnim,
        ]}
      />

      {/* Botão "Novo" foi movido para a Tab Bar (botão central com ícone de +) */}
    </View>
  );
}

// estilos movidos para styles/screens/HomeScreen.styles.js
