export function getAISuggestion(gastosMes = 0) {
  // Simulação simples baseada nos gastos
  if (gastosMes > 2000) {
    return 'Você pode economizar R$150 este mês reduzindo gastos com transporte e assinaturas.';
  }
  if (gastosMes > 1200) {
    return 'Você pode economizar R$120 este mês com delivery.';
  }
  return 'Excelente! Que tal guardar R$80 extras este mês para acelerar uma meta?';
}
