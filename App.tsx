// Main App Component with Navigation

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { notificationService } from './src/services/notificationService';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import ListingsScreen from './src/screens/ListingsScreen';
import CameraScreen from './src/components/CameraScreen';
import PhotoEditor from './src/components/PhotoEditor';
import CreateListingScreen from './src/components/CreateListingScreen';
import CrossPostingScreen from './src/screens/CrossPostingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MarketplaceConnectionsScreen from './src/screens/MarketplaceConnectionsScreen';
import ProductListingScreen from './src/screens/ProductListingScreen';
import InventoryManagementScreen from './src/screens/InventoryManagementScreen';
import MarketplaceListingsScreen from './src/screens/MarketplaceListingsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import PricingRulesScreen from './src/screens/PricingRulesScreen';
import AuthScreen from './src/screens/AuthScreen';

import { RootStackParamList, MainTabParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Listings') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: 'rgba(255,255,255,0.1)',
        },
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Inventory" 
        component={InventoryManagementScreen}
        options={{ title: 'Inventory' }}
      />
      <Tab.Screen 
        name="Listings" 
        component={MarketplaceListingsScreen}
        options={{ title: 'Listings' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Custom Camera Tab Button
function TabBarButton(props: any) {
  return (
    <TouchableOpacity
      {...props}
      style={[
        props.style,
        {
          backgroundColor: '#007AFF',
          borderRadius: 30,
          width: 60,
          height: 60,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        },
      ]}
    >
      <Ionicons name="camera" size={30} color="white" />
    </TouchableOpacity>
  );
}

function AppContent() {
  useEffect(() => {
    // Initialize notification service
    notificationService.initialize();
    
    return () => {
      // Cleanup
      notificationService.cleanup();
    };
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Main" 
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Camera" 
          component={CameraScreen}
          options={{ 
            title: 'Camera',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="PhotoEditor" 
          component={PhotoEditor}
          options={{ 
            title: 'Edit Photo',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="CreateListing" 
          component={CreateListingScreen}
          options={{ 
            title: 'Create Listing',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="MarketplaceConnection" 
          component={MarketplaceConnectionsScreen}
          options={{ 
            title: 'Connect Marketplace',
          }}
        />
        <Stack.Screen 
          name="ProductListing" 
          component={ProductListingScreen}
          options={{ 
            title: 'List Your Product',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="PricingRules" 
          component={PricingRulesScreen}
          options={{ 
            title: 'Pricing Rules',
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{ 
            title: 'Authentication',
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
