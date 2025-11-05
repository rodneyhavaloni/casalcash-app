import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#1F2937',
    fontSize: 16,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    color: '#9CA3AF',
    marginBottom: 10,
  },
});
