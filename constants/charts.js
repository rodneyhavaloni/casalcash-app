// Paleta de cores claras e alegres (pastéis) para gráficos
export const pastelColors = [
  '#FFB3BA', // rosa claro
  '#FFDFBA', // pêssego
  '#FFFFBA', // amarelo claro
  '#BAFFC9', // verde menta
  '#BAE1FF', // azul claro
  '#E5D1FA', // lilás
  '#F8C8DC', // rosa bebê
  '#C9F0FF', // azul gelo
  '#C4FCEF', // verde água
  '#FCE2DB', // salmão claro
];

export function pickPastel(index) {
  const list = pastelColors;
  return list[index % list.length];
}
