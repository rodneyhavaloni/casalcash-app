import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Input from '../components/Input';
import Button from '../components/Button';
import { supabase } from '../services/supabaseClient';
import styles from '../styles/screens/AddItemScreen.style';
import { colors, spacing, radii } from '../components/theme';
import { pastelColors, pickPastel } from '../constants/charts';
import Chip from '../components/Chip';
import DatePickerField from '../components/DatePickerField';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import TopBar from '../components/TopBar';

export default function AddItemScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('receipt-outline');
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
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState('');
  const [iconsExpanded, setIconsExpanded] = useState(false);
  const [parcelado, setParcelado] = useState(null);
  const [valorParcelaDirty, setValorParcelaDirty] = useState(false);
  const [parceladoDirty, setParceladoDirty] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [metodos, setMetodos] = useState([]); // métodos de pagamento vindos do banco
  const [tipos, setTipos] = useState([]); // tipos de despesa vindos do banco
  // Flags para exibir erros somente após tentativa de confirmar
  const [attempted1, setAttempted1] = useState(false);
  const [attempted2, setAttempted2] = useState(false);
  const [attempted3, setAttempted3] = useState(false);
  
  // Estilos simples de erro para campos não-Input
  const errorTextStyle = { color: '#F43F5E', marginTop: 4, fontFamily: 'Poppins_400Regular' };

  // Animações (igual Home: enter + progress + cards)
  const enter = useSharedValue(0);
  const stepAnim = useSharedValue(0);
  const s1 = useSharedValue(1);
  const s2 = useSharedValue(1);
  const s3 = useSharedValue(1);

  const contentAnim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * 8 },
    ],
  }));

  const cardAnim = useAnimatedStyle(() => ({
    opacity: stepAnim.value,
    transform: [
      { translateY: (1 - stepAnim.value) * 10 },
      { scale: 0.98 + stepAnim.value * 0.02 },
    ],
  }));

  const circle1Style = useAnimatedStyle(() => ({ transform: [{ scale: s1.value }] }));
  const circle2Style = useAnimatedStyle(() => ({ transform: [{ scale: s2.value }] }));
  const circle3Style = useAnimatedStyle(() => ({ transform: [{ scale: s3.value }] }));
  const circleStyles = [circle1Style, circle2Style, circle3Style];

  // Linhas com preenchimento animado entre os passos
  const seg1 = useSharedValue(0); // entre 1-2
  const seg2 = useSharedValue(0); // entre 2-3
  const seg1Style = useAnimatedStyle(() => ({ width: `${Math.round(seg1.value * 100)}%` }));
  const seg2Style = useAnimatedStyle(() => ({ width: `${Math.round(seg2.value * 100)}%` }));

  // Helpers para datas no formato DD-MM/YYYY na UI
  const formatDateDDMMYYYY = (t = '') => {
    const digits = String(t).replace(/\D/g, '');
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    let out = d;
    if (m) out += '-' + m;
    if (y) out += '/' + y;
    return out;
  };

  const toISOFromDDMMYYYY = (s = '') => {
    const m = String(s).match(/^(\d{2})-(\d{2})\/(\d{4})$/);
    if (!m) return s; // retorna como está se não casar, evitando quebrar
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

  // Heurística de ícone e cor por categoria (alinhado com Home)
  const pickCategoryIcon = (name = '') => {
    const n = String(name).toLowerCase();
    if (/aliment|mercad|supermerc/.test(n)) return 'fast-food-outline';
    if (/casa|aluguel|moradi|condom|luz|água|agua|energia/.test(n)) return 'home-outline';
    if (/transp|uber|car|combust|gasolina|ipva|estac/.test(n)) return 'car-outline';
    if (/saúde|saude|farm|méd|med|consulta|plano/.test(n)) return 'medkit-outline';
    if (/educa|curso|facul|escola|livro/.test(n)) return 'school-outline';
    if (/lazer|entreten|cinema|bar|resta|viag|passeio/.test(n)) return 'happy-outline';
    if (/assin|stream|netflix|spotify|prime|hbo/.test(n)) return 'play-circle-outline';
    if (/imposto|taxa|tarifa|banco|juros|multa/.test(n)) return 'cash-outline';
    if (/roupa|vestu|calc|camis|tenis|sapato/.test(n)) return 'shirt-outline';
    return 'pricetag-outline';
  };

  const normalize = (s = '') =>
    String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const fixedCategoryColors = {
    alimentacao: '#D97706',
    casa: '#BAE1FF',
    transporte: '#FFB3BA',
    saude: '#BAFFC9',
    educacao: '#E5D1FA',
    lazer: '#F8C8DC',
    assinaturas: '#C9F0FF',
    impostos: '#FCE2DB',
    roupas: '#C4FCEF',
    outros: '#FFDFBA',
  };

  const hashToIndex = (str, mod) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % mod;
  };

  const getFixedColorForCategory = (name = '') => {
    const key = normalize(name);
    if (fixedCategoryColors[key]) return fixedCategoryColors[key];
    const idx = hashToIndex(key, pastelColors.length);
    return pastelColors[idx] || pickPastel(idx);
  };

  // Navegação pelos passos ao tocar nos círculos
  const isStep2Valid = () => {
    const total = Number(String(valorTotal || '').replace(',', '.'));
    const parcela = Number(String(valorParcela || '').replace(',', '.'));
    const qtd = Number(qtdParcelas || '');
    if (!(total > 0)) return false;
    if (!metodoPagId) return false;
    if (parcelado === true) {
      if (!(qtd > 0)) return false;
      if (!(parcela > 0)) return false;
    }
    return true;
  };

  // Erros por etapa (renderização)
  const step1NomeError = step === 1 && attempted1 && !nome.trim() ? 'Obrigatório' : undefined;
  const step1DescError = step === 1 && attempted1 && !descricao.trim() ? 'Obrigatório' : undefined;
  const totalNum = Number(String(valorTotal || '').replace(',', '.'));
  const parcelaNum = Number(String(valorParcela || '').replace(',', '.'));
  const qtdNum = Number(qtdParcelas || '');
  const step2ValorError = step === 2 && attempted2 && !(totalNum > 0) ? 'Informe um valor válido' : undefined;
  const step2MetodoError = step === 2 && attempted2 && !metodoPagId ? 'Selecione um método de pagamento' : undefined;
  const step2QtdError = step === 2 && attempted2 && parcelado === true && !(qtdNum > 0) ? 'Informe a quantidade de parcelas' : undefined;
  const step2ValorParcelaError = step === 2 && attempted2 && parcelado === true && !(parcelaNum > 0) ? 'Informe um valor de parcela válido' : undefined;
  const step2PagamentoGroupError =
    step === 2 && attempted2 && parcelado === true && (!(qtdNum > 0) || !(parcelaNum > 0))
      ? 'Preencha quantidade e valor da parcela'
      : undefined;
  const step3CategoriaError = step === 3 && attempted3 && !categoriaId ? 'Selecione uma categoria' : undefined;
  const step3TipoError = step === 3 && attempted3 && !tipoId ? 'Selecione um tipo' : undefined;
  const step3CompraError = step === 3 && attempted3 && !(String(dataCompra).length >= 10) ? 'Informe a data da compra' : undefined;
  const step3VencError = step === 3 && attempted3 && !(String(vencimento).length >= 10) ? 'Informe o vencimento' : undefined;

  const handleStepPress = (i) => {
    // Sempre pode voltar
    if (i < step) {
      setStep(i);
      return;
    }
    // Mesmo passo, nada a fazer
    if (i === step) return;
    // Avançar: por enquanto liberamos ir ao passo 2 se nome estiver preenchido
    if (i === 2) {
      if (nome.trim() && descricao.trim()) {
        setStep(2);
      } else {
        setAttempted1(true);
        Alert.alert('Atenção', 'Preencha Nome e Descrição para avançar.');
      }
      return;
    }
    // Avançar ao passo 3: validar passo 2
    if (i === 3) {
      if (isStep2Valid()) {
        setStep(3);
      } else {
        setAttempted2(true);
        Alert.alert('Atenção', 'Preencha os campos da etapa 2 antes de avançar.');
      }
      return;
    }
  };

  useEffect(() => {
    // animação inicial de entrada
    enter.value = 0;
    enter.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    // anima o primeiro card
    stepAnim.value = 0;
    stepAnim.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    // estado inicial das linhas
    seg1.value = withTiming(step >= 2 ? 1 : 0, { duration: 400, easing: Easing.out(Easing.cubic) });
    seg2.value = withTiming(step >= 3 ? 1 : 0, { duration: 400, easing: Easing.out(Easing.cubic) });

    (async () => {
      // Carrega usuário para exibir info no topo
      try {
        const { data } = await supabase.auth.getUser();
        const u = data?.user;
        const name = u?.user_metadata?.full_name || u?.email || u?.id || '';
        setUserName(name);
      } catch {}

      try {
        // Preferir "Categoria" (C maiúsculo) conforme solicitado; tentar com colunas cor/icone e fallbacks
        let res = await supabase.from('Categoria').select('id, nome, cor, icone').order('nome', { ascending: true });
        if (res.error) {
          // tentar nomes alternativos de colunas
          res = await supabase.from('Categoria').select('id, nome, color, icon').order('nome', { ascending: true });
        }
        if (res.error) {
          res = await supabase.from('Categoria').select('id, nome').order('nome', { ascending: true });
        }
        if (res.error) {
          // fallbacks para tabela em minúsculo
          res = await supabase.from('categoria').select('id, nome, cor, icone').order('nome', { ascending: true });
          if (res.error) {
            res = await supabase.from('categoria').select('id, nome, color, icon').order('nome', { ascending: true });
          }
          if (res.error) {
            res = await supabase.from('categoria').select('id, nome').order('nome', { ascending: true });
          }
        }
        if (res.error) throw res.error;
        setCategorias(res.data || []);
      } catch (e) {
        console.warn('Falha ao carregar categorias:', e?.message || e);
        setCategorias([]);
      }

      // Carrega métodos de pagamento
      try {
        let mRes = await supabase.from('metodo_pagamento').select('id, nome').order('nome', { ascending: true });
        if (mRes.error) {
          mRes = await supabase.from('Metodo_Pagamento').select('id, nome').order('nome', { ascending: true });
        }
        if (mRes.error) throw mRes.error;
        setMetodos(mRes.data || []);
      } catch (e) {
        console.warn('Falha ao carregar métodos de pagamento:', e?.message || e);
        setMetodos([]);
      }

      // Carrega tipos de despesa
      try {
        // Nome informado: "tipo de despesa" (com espaço) e coluna "tipo"
        let tRes = await supabase.from('tipo de despesa').select('id, tipo').order('tipo', { ascending: true });
        if (tRes.error) {
          // Fallbacks comuns
          tRes = await supabase.from('Tipo de Despesa').select('id, tipo').order('tipo', { ascending: true });
        }
        if (tRes.error) {
          tRes = await supabase.from('tipo_de_despesa').select('id, tipo').order('tipo', { ascending: true });
        }
        if (tRes.error) {
          tRes = await supabase.from('Tipo_de_Despesa').select('id, tipo').order('tipo', { ascending: true });
        }
        if (tRes.error) {
          tRes = await supabase.from('tipo de despesa').select('id, tipo').order('tipo', { ascending: true });
        }
        if (tRes.error) throw tRes.error;
        setTipos(tRes.data || []);
      } catch (e) {
        console.warn('Falha ao carregar tipos de despesa:', e?.message || e);
        setTipos([]);
      }
    })();
  }, []);

  // Ajuste automático: vencimento não pode ser menor que dataCompra
  useEffect(() => {
    const dc = parseDDMMYYYYToDate(dataCompra);
    const v = parseDDMMYYYYToDate(vencimento);
    if (dc && v && v.getTime() < dc.getTime()) {
      setVencimento(dataCompra);
    }
  }, [dataCompra]);

  // Anima mudança de passo e escala do círculo atual
  useEffect(() => {
    // reseta e anima o conteúdo do card quando o passo muda
    stepAnim.value = 0;
    stepAnim.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    // atualiza escala dos círculos
    s1.value = withTiming(step === 1 ? 1.08 : 1, { duration: 220, easing: Easing.out(Easing.cubic) });
    s2.value = withTiming(step === 2 ? 1.08 : 1, { duration: 220, easing: Easing.out(Easing.cubic) });
    s3.value = withTiming(step === 3 ? 1.08 : 1, { duration: 220, easing: Easing.out(Easing.cubic) });
    // preenche linhas conforme passo
    seg1.value = withTiming(step >= 2 ? 1 : 0, { duration: 380, easing: Easing.out(Easing.cubic) });
    seg2.value = withTiming(step >= 3 ? 1 : 0, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, [step]);

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
      const dataCompraISO = dataCompra ? toISOFromDDMMYYYY(dataCompra) : null;
      const vencimentoISO = vencimento ? toISOFromDDMMYYYY(vencimento) : null;
      const payload = {
        nome,
        descricao: descricao || null,
        valor_total: total,
        valor_parcela: parcela,
        qtd_parcelas: qtd,
        parcela_atual: atual,
        tipo,
        data_compra: dataCompraISO,
        vencimento_parcela: vencimentoISO,
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

  const isStep3Valid = () => {
    if (!categoriaId) return false;
    if (!tipoId) return false;
    if (!(String(dataCompra).length >= 10)) return false;
    if (!(String(vencimento).length >= 10)) return false;
    return true;
  };

  // Recalcula valor da parcela quando aplicável e o usuário não alterou manualmente
  useEffect(() => {
    if (!parcelado) return;
    const total = valorTotal ? Number(String(valorTotal).replace(',', '.')) : NaN;
    const qtd = qtdParcelas ? Number(qtdParcelas) : NaN;
    if (!valorParcelaDirty && isFinite(total) && total > 0 && isFinite(qtd) && qtd > 0) {
      const calc = (total / qtd).toFixed(2);
      // Mantém vírgula como separador se usuário usa vírgula
      setValorParcela(calc.replace('.', ','));
    }
  }, [parcelado, valorTotal, qtdParcelas, valorParcelaDirty]);

  // Lista de ícones sugeridos para a despesa
  const iconOptions = [
    'receipt-outline',
    'cart-outline',
    'fast-food-outline',
    'home-outline',
    'car-outline',
    'happy-outline',
    'medkit-outline',
    'school-outline',
    'play-circle-outline',
    'cash-outline',
    'shirt-outline',
    'pricetag-outline',
    'wallet-outline',
    'calendar-outline',
    'cafe-outline',
    'airplane-outline',
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Topbar verde maior com título */}
      <TopBar title="Nova Despesa" />

      {/* Barra de progresso (fixa logo abaixo da topbar) */}
      <View style={{ alignItems: 'center', backgroundColor: colors.background }}>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Etapa ${step} de 3`}
          style={{
            width: '100%',
            maxWidth: 720,
            paddingHorizontal: spacing.md,
            marginTop: spacing.md,
            marginBottom: 0,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {[1, 2, 3].map((i) => {
              const done = step > i;
              const current = step === i;
              const circleBg = done || current ? colors.green : '#FFFFFF';
              const circleBorder = done || current ? colors.green : '#E5E7EB';
              const textColor = done || current ? '#FFFFFF' : '#6B7280';
              return (
                <React.Fragment key={`step-${i}`}>
                  <Animated.View style={circleStyles[i - 1]}> 
                  <Pressable
                    onPress={() => handleStepPress(i)}
                    android_ripple={{ color: done || current ? '#BBF7D0' : '#E5E7EB' }}
                    accessibilityRole="button"
                    accessibilityLabel={`Ir para etapa ${i}`}
                    style={({ pressed, hovered }) => ([
                      {
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: circleBg,
                        borderWidth: 2,
                        borderColor: circleBorder,
                      },
                      hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }] },
                      pressed && { transform: [{ scale: 0.96 }], opacity: 0.96 },
                    ])}
                  >
                    {done ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: textColor, fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>{i}</Text>
                    )}
                  </Pressable>
                  </Animated.View>
                  {i < 3 && (
                    <View
                      style={{
                        flex: 1,
                        height: 2,
                        backgroundColor: '#E5E7EB',
                        marginHorizontal: 8,
                        overflow: 'hidden',
                        borderRadius: 1,
                      }}
                    >
                      <Animated.View
                        style={[
                          {
                            height: 2,
                            backgroundColor: colors.green,
                            width: '0%',
                          },
                          i === 1 ? seg1Style : seg2Style,
                        ]}
                      />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </View>

      <Animated.ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={[
          styles.container,
          {
            backgroundColor: 'transparent',
            paddingTop: (spacing.xs ?? 4),
            paddingBottom: spacing.lg,
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexGrow: 1,
          },
        ]}
        style={contentAnim}
      >        

        {/* Card do passo 1 */}
        {step === 1 && (
        <Animated.View
          style={[
            {
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
            },
            cardAnim,
          ]}
        >
          {/* Info do usuário (não editável) */}
          <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium' }}>Quem está criando</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: spacing.md }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person-outline" size={18} color={colors.greenDark} />
            </View>
            <Text style={{ marginLeft: 10, color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>{userName || '—'}</Text>
          </View>

          {/* Nome da despesa */}
          <Input label="Nome da despesa" value={nome} onChangeText={setNome} placeholder="Ex.: Fatura do cartão" error={step1NomeError} />

          {/* Descrição (logo abaixo do nome) */}
          <Input
            label="Descrição"
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Descreva a despesa"
            multiline
            numberOfLines={3}
            inputStyle={{ height: 96, textAlignVertical: 'top' }}
            error={step1DescError}
          />

          {/* Campo expansivo de ícone */}
          <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium', marginTop: spacing.sm }}>Ícone</Text>
          <Pressable
            onPress={() => { Keyboard.dismiss(); setIconsExpanded((v) => !v); }}
            android_ripple={{ color: '#E5E7EB' }}
            accessibilityRole="button"
            accessibilityLabel="Escolher ícone da despesa"
            style={({ pressed, hovered }) => ([
              {
                marginTop: 8,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
              hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }], elevation: 2 },
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.96 },
            ])}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={selectedIcon} size={16} color={colors.greenDark} />
              </View>
              <Text style={{ marginLeft: 10, color: colors.text, fontFamily: 'Poppins_500Medium' }}>Selecionar ícone</Text>
            </View>
            <Ionicons name={iconsExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={'#9CA3AF'} />
          </Pressable>

          {iconsExpanded && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
              {iconOptions.map((icon) => {
                const selected = selectedIcon === icon;
                return (
                  <Pressable
                    key={icon}
                    onPress={() => { setSelectedIcon(icon); setIconsExpanded(false); }}
                    android_ripple={{ color: selected ? '#A7F3D0' : '#E5E7EB' }}
                    style={({ pressed, hovered }) => ([
                      {
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: selected ? '#22C55E' : '#E5E7EB',
                        backgroundColor: selected ? '#4ADE80' : '#FFFFFF',
                        marginRight: 10,
                        marginBottom: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      pressed && { transform: [{ scale: 0.97 }], opacity: 0.96 },
                      hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }] },
                    ])}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name={icon} size={22} color={selected ? '#FFFFFF' : '#6B7280'} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Ações do passo 1 */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button label="Cancelar" variant="secondary" onPress={() => navigation.goBack()} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Continuar"
                variant="primary"
                onPress={() => {
                  if (nome.trim() && descricao.trim()) {
                    setStep(2);
                    setAttempted1(false);
                  } else {
                    setAttempted1(true);
                  }
                }}
              />
            </View>
          </View>
        </Animated.View>
        )}

        {/* Card do passo 2 */}
        {step === 2 && (
        <Animated.View
          style={[
            {
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
            },
            cardAnim,
          ]}
        >
          {/* Categoria removida deste passo por solicitação; seguirá em etapa futura */}

          {/* Valor total */}
          <Input
            label="Valor total"
            value={valorTotal}
            onChangeText={(t) => { setValorTotal(t); }}
            placeholder="0,00"
            keyboardType="decimal-pad"
            error={step2ValorError}
          />

          {/* Forma de pagamento */}
          <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium', marginTop: spacing.sm }}>Forma de pagamento</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: 8,
              padding: step2MetodoError ? 8 : 0,
              borderWidth: step2MetodoError ? 1 : 0,
              borderColor: step2MetodoError ? '#F43F5E' : 'transparent',
              borderRadius: 12,
            }}
          >
            {metodos.map((m) => {
              const selected = Number(metodoPagId) === Number(m.id);
              return (
                <Chip
                  key={m.id}
                  label={m.nome}
                  selected={selected}
                  onPress={() => {
                    setMetodoPagId(String(m.id));
                    const n = normalize(m?.nome || '');
                    // Força o comportamento: crédito => parcelado; demais => à vista
                    if (n.includes('credito')) {
                      setParcelado(true);
                      // Pré-preencher valorParcela se possível
                      const total = valorTotal ? Number(String(valorTotal).replace(',', '.')) : NaN;
                      const qtd = qtdParcelas ? Number(qtdParcelas) : NaN;
                      if (isFinite(total) && total > 0 && isFinite(qtd) && qtd > 0) {
                        setValorParcela((total / qtd).toFixed(2).replace('.', ','));
                      }
                    } else {
                      setParcelado(false);
                      setQtdParcelas('');
                      setValorParcela('');
                      setValorParcelaDirty(false);
                    }
                  }}
                />
              );
            })}
          </View>
          {!!step2MetodoError && <Text style={errorTextStyle}>{step2MetodoError}</Text>}

          {/* Parcelado? */}
          <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium', marginTop: spacing.sm }}>Pagamento</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: 8,
              padding: step2PagamentoGroupError ? 8 : 0,
              borderWidth: step2PagamentoGroupError ? 1 : 0,
              borderColor: step2PagamentoGroupError ? '#F43F5E' : 'transparent',
              borderRadius: 12,
            }}
          >
            {[{ v: false, label: 'À vista' }, { v: true, label: 'Parcelado' }].map((opt) => {
              const selected = parcelado === opt.v;
              return (
                <Chip
                  key={String(opt.v)}
                  label={opt.label}
                  selected={selected}
                  onPress={() => {
                    setParcelado(opt.v);
                    setParceladoDirty(true);
                    if (!opt.v) {
                      setQtdParcelas('');
                      setValorParcela('');
                      setValorParcelaDirty(false);
                    } else {
                      // ao habilitar, tentar pré-preencher se possível
                      const total = valorTotal ? Number(String(valorTotal).replace(',', '.')) : NaN;
                      const qtd = qtdParcelas ? Number(qtdParcelas) : NaN;
                      if (isFinite(total) && total > 0 && isFinite(qtd) && qtd > 0) {
                        setValorParcela((total / qtd).toFixed(2).replace('.', ','));
                      }
                    }
                  }}
                />
              );
            })}
          </View>
          {!!step2PagamentoGroupError && <Text style={errorTextStyle}>{step2PagamentoGroupError}</Text>}

          {parcelado && (
            <View style={{ marginTop: spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Qtd de parcelas"
                    value={qtdParcelas}
                    onChangeText={(t) => {
                      // mantém apenas números
                      const onlyNum = t.replace(/[^0-9]/g, '');
                      setQtdParcelas(onlyNum);
                      // se usuário tinha editado manualmente, não limpamos dirty aqui
                    }}
                    placeholder="Ex.: 12"
                    keyboardType="number-pad"
                    error={step2QtdError}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Valor da parcela"
                    value={valorParcela}
                    onChangeText={(t) => { setValorParcela(t); setValorParcelaDirty(true); }}
                    placeholder="0,00"
                    keyboardType="decimal-pad"
                    error={step2ValorParcelaError}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Ações do passo 2 */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button label="Voltar" variant="secondary" onPress={() => setStep(1)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Continuar"
                variant="primary"
                onPress={() => {
                  if (isStep2Valid()) {
                    setStep(3);
                    setAttempted2(false);
                  } else {
                    setAttempted2(true);
                  }
                }}
              />
            </View>
          </View>
        </Animated.View>
        )}

        {/* Card do passo 3 */}
        {step === 3 && (
        <Animated.View
          style={[
            {
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
            },
            cardAnim,
          ]}
        >
          {/* Categoria (Dropdown com ícone, nome e chip de cor) */}
          <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium' }}>Categoria</Text>
          {(() => {
            const sel = categorias.find((c) => Number(categoriaId) === Number(c.id));
            const selectedColor = sel?.cor || sel?.color || (sel ? getFixedColorForCategory(sel?.nome || '') : '#FFFFFF');
            const selectedIcon = sel?.icone || sel?.icon || (sel ? pickCategoryIcon(sel?.nome || '') : 'pricetag-outline');
            return (
              <View style={{ marginTop: 8 }}>
                <Pressable
                  onPress={() => setCategoriesExpanded((v) => !v)}
                  android_ripple={{ color: '#E5E7EB' }}
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar categoria"
                  style={({ pressed, hovered }) => ([
                    {
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: step3CategoriaError ? '#F43F5E' : (sel ? colors.green : '#E5E7EB'),
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    },
                    hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }], elevation: 2 },
                    pressed && { transform: [{ scale: 0.98 }], opacity: 0.96 },
                  ])}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: selectedColor, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={selectedIcon} size={16} color={'#FFFFFF'} />
                    </View>
                    <Text style={{ marginLeft: 10, color: colors.text, fontFamily: 'Poppins_500Medium', flexShrink: 1 }} numberOfLines={1}>
                      {sel?.nome || 'Selecione uma categoria'}
                    </Text>
                    {!!sel && (
                      <View style={{ marginLeft: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: selectedColor }} />
                    )}
                  </View>
                  <Ionicons name={categoriesExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={'#9CA3AF'} />
                </Pressable>

                {categoriesExpanded && (
                  <View style={{ marginTop: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    {categorias.map((c) => {
                      const selected = Number(categoriaId) === Number(c.id);
                      const catColor = c?.cor || c?.color || getFixedColorForCategory(c?.nome || '');
                      const catIcon = c?.icone || c?.icon || pickCategoryIcon(c?.nome || '');
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => { setCategoriaId(c.id); setCategoriesExpanded(false); }}
                          android_ripple={{ color: selected ? '#A7F3D0' : '#E5E7EB' }}
                          style={({ pressed }) => ([
                            {
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: '#F3F4F6',
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
                )}
              </View>
            );
          })()}
          {!!step3CategoriaError && <Text style={errorTextStyle}>{step3CategoriaError}</Text>}

          {/* Tipo de despesa */}
          <Text style={{ color: '#6B7280', fontFamily: 'Poppins_500Medium', marginTop: spacing.sm }}>Tipo</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: 8,
              padding: step3TipoError ? 8 : 0,
              borderWidth: step3TipoError ? 1 : 0,
              borderColor: step3TipoError ? '#F43F5E' : 'transparent',
              borderRadius: 12,
            }}
          >
            {tipos.map((t) => {
              const selected = Number(tipoId) === Number(t.id);
              return (
                <Chip
                  key={t.id}
                  label={t.tipo}
                  selected={selected}
                  onPress={() => setTipoId(String(t.id))}
                />
              );
            })}
          </View>
          {!!step3TipoError && <Text style={errorTextStyle}>{step3TipoError}</Text>}

          {/* Datas */}
          <View style={{ marginTop: spacing.sm }}>
            <DatePickerField
              label="Data da compra"
              value={dataCompra}
              onChange={(val) => setDataCompra(val)}
              maxDate={new Date()}
              error={step3CompraError}
            />
            <DatePickerField
              label="Vencimento da compra/parcela"
              value={vencimento}
              onChange={(val) => setVencimento(val)}
              minDate={parseDDMMYYYYToDate(dataCompra) || undefined}
              error={step3VencError}
            />
          </View>

          {/* Ações do passo 3 */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button label="Voltar" variant="secondary" onPress={() => setStep(2)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={saving ? 'Salvando...' : 'Salvar'}
                variant="primary"
                onPress={() => {
                  if (!isStep3Valid()) {
                    setAttempted3(true);
                    return;
                  }
                  onSave();
                }}
                disabled={saving}
              />
            </View>
          </View>
        </Animated.View>
        )}

      </Animated.ScrollView>
    </View>
  );
}

// estilos movidos para styles/screens/AddItemScreen.styles.js
