import React from 'react';
import { NavigationContainer, DefaultTheme, useNavigation, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthRoutes from './auth';
import HomeScreen from '../screens/HomeScreen';
import ItemListScreen from '../screens/ItemListScreen';
import GoalsScreen from '../screens/GoalsScreen';
import CreateGoalsScreen from '../screens/CreateGoalsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddItemScreen from '../screens/AddItemScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import DebtProjectionScreen from '../screens/DebtProjectionScreen';
import GoalsDashboardScreen from '../screens/GoalsDashboardScreen';
import CreateChooserScreen from '../screens/CreateChooserScreen';
import CreateCategoryScreen from '../screens/CreateCategoryScreen';
import { colors } from '../constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.background },
};

function Tabs() {
  const navigation = useNavigation();
  const isIOS = Platform.OS === 'ios';
  const insets = useSafeAreaInsets();

  const AddTabButton = (props) => (
    <Pressable
      {...props}
      onPress={() => navigation.navigate('CreateChooser')}
      android_ripple={{ color: '#FECACA' }}
      accessibilityRole="button"
      style={({ pressed, hovered }) => ([
        {
          top: isIOS ? -24 : -26,
          justifyContent: 'center',
          alignItems: 'center',
        },
        hovered && Platform.OS === 'web' && { transform: [{ translateY: -1 }], elevation: 8 },
        pressed && { transform: [{ scale: 0.96 }, { translateY: 1 }], opacity: 0.95 },
      ])}
    >
      <View
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.salmon,
          borderWidth: 4,
          borderColor: colors.background,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 6,
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="add" size={30} color="#fff" />
        </View>
      </View>
    </Pressable>
  );

  const EmptyScreen = () => null;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.greenDark,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#EEF2F7',
          height: 64 + (insets.bottom || 0),
          paddingTop: 6,
          paddingBottom: Math.max(8, insets.bottom || 0),
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Despesas: 'card-outline',
            Novo: 'add',
            Metas: 'trophy',
            Config: 'settings',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Despesas" component={ItemListScreen} options={{ tabBarLabel: 'Despesas' }} />
      <Tab.Screen
        name="Novo"
        component={EmptyScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: (props) => <AddTabButton {...props} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('CreateChooser');
          },
        })}
      />
      <Tab.Screen name="Metas" component={GoalsScreen} />
      <Tab.Screen name="Config" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function Routes({ session }) {
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = React.useRef();

  return (
    <NavigationContainer
      theme={navTheme}
      ref={navigationRef}
      onReady={() => {
        const current = navigationRef.getCurrentRoute();
        routeNameRef.current = current?.name;
        console.log(`[NAV] ready -> ${current?.name || 'unknown'}`);
      }}
      onStateChange={() => {
        const previous = routeNameRef.current;
        const current = navigationRef.getCurrentRoute();
        const now = new Date().toISOString();
        if (current) {
          try {
            console.log(`[NAV] ${now} ${previous || '-'} -> ${current.name}`, current.params || {});
          } catch (e) {
            console.log(`[NAV] ${now} ${previous || '-'} -> ${current?.name}`);
          }
          routeNameRef.current = current.name;
        }
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthRoutes} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} />
            <Stack.Screen name="AddItem" component={AddItemScreen} />
            <Stack.Screen name="CreateChooser" component={CreateChooserScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateGoals" component={CreateGoalsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateCategory" component={CreateCategoryScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DebtProjection" component={DebtProjectionScreen} options={{ headerShown: true, title: 'Projeção de Dívidas' }} />
            <Stack.Screen name="GoalsDashboard" component={GoalsDashboardScreen} options={{ headerShown: true, title: 'Dashboard de Metas' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
