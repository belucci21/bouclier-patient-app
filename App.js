import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import QRScanScreen from './src/screens/QRScanScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PrescriptionsScreen from './src/screens/PrescriptionsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import ScheduleAppointmentScreen from './src/screens/ScheduleAppointmentScreen';
import LoginScreen from './src/screens/LoginScreen';
import { View, ActivityIndicator } from 'react-native';

const Tab = createBottomTabNavigator();

const GOLD = '#b89a5a';
const DARK = '#1a1a1a';
const GRAY = '#2a2a2a';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: DARK, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={GOLD} />
    </View>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: GRAY },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: GRAY, borderTopColor: '#333' },
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: '#666',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Inicio') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Mis Citas') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Check-in') iconName = focused ? 'qr-code' : 'qr-code-outline';
          else if (route.name === 'Recetas') iconName = focused ? 'medical' : 'medical-outline';
          else if (route.name === 'Agendar') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'Informes') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Mis Citas" component={AppointmentsScreen} />
      <Tab.Screen name="Check-in" component={QRScanScreen} />
      <Tab.Screen name="Recetas" component={PrescriptionsScreen} />
      <Tab.Screen name="Agendar" component={ScheduleAppointmentScreen} />
      <Tab.Screen name="Informes" component={ReportsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {user ? <AppTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
