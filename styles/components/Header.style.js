import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingLeft: 20,
    paddingRight: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
  },
  subtitle: {
    color: '#F0FDF4',
    fontFamily: 'Poppins_400Regular',
    marginTop: 4,
  },
});
