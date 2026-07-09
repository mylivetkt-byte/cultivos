import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

// WatermelonDB
import DatabaseProvider from '@nozbe/watermelondb/DatabaseProvider';
import { database } from './src/database';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import HierarchyScreen from './src/screens/HierarchyScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <DatabaseProvider database={database}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Hierarchy" component={HierarchyScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </DatabaseProvider>
  );
}
