import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  gradient: { flex: 1, paddingLeft: 20, paddingRight: 20, alignItems: 'center', justifyContent: 'center' },
  logoBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  logo: { fontFamily: 'Poppins_700Bold', fontSize: 28, marginLeft: 8, color: '#1F2937' },
  illustration: { width: 200, height: 140, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EEF2F7', marginBottom: 20 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#1F2937', textAlign: 'center' },
  footer: { marginTop: 28, color: '#9CA3AF', textDecorationLine: 'underline', fontFamily: 'Poppins_400Regular' },
});
