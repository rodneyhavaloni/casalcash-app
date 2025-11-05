import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  wrapper: { marginBottom: 16, width: '100%' },
  label: { fontFamily: 'Poppins_500Medium', color: '#1F2937', marginBottom: 6 },
  inputContainer: { position: 'relative', width: '100%' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: 'Poppins_400Regular',
    width: '100%',
  },
  right: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  error: { color: '#F43F5E', marginTop: 4, fontFamily: 'Poppins_400Regular' },
});
