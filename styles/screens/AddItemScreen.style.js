import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, color: '#1F2937' },
  subtitle: { marginTop: 8, color: '#6B7280', fontFamily: 'Poppins_400Regular' },
  form: { marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, marginBottom: 8 },
  chipLabel: { fontFamily: 'Poppins_400Regular', color: '#1F2937' },
  chipSelected: { backgroundColor: '#4ADE80', borderColor: '#22C55E' },
  chipLabelSelected: { color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' },
  saveBtn: { marginTop: 16 },
});
