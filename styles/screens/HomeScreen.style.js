import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  content: { padding: 20 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  gridItem: { width: '48%' },
  value: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, color: '#1F2937' },
  suggestion: { fontFamily: 'Poppins_400Regular', color: '#1F2937' },
  fab: { position: 'absolute', right: 20, bottom: 20 },
});
