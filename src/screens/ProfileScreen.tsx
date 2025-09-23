// Profile Screen - User settings and account management

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useUserStats } from '../hooks/useApi';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { data: stats } = useUserStats();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleConnectMarketplace = () => {
    navigation.navigate('MarketplaceConnection');
  };

  const handleSettings = () => {
    // Navigate to settings screen
    Alert.alert('Settings', 'Settings screen coming soon!');
  };

  const handleHelp = () => {
    Alert.alert('Help', 'Help and support coming soon!');
  };

  const handleAbout = () => {
    Alert.alert(
      'About OmniLister',
      'Version 1.0.0\n\nBuilt with React Native and dual AI technology (GPT-5 + Claude) for maximum accuracy in cross-listing automation.'
    );
  };

  const menuItems = [
    {
      icon: 'storefront',
      title: 'Marketplace Connections',
      subtitle: 'Manage your marketplace accounts',
      onPress: handleConnectMarketplace,
    },
    {
      icon: 'settings',
      title: 'Settings',
      subtitle: 'App preferences and configuration',
      onPress: handleSettings,
    },
    {
      icon: 'help-circle',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: handleHelp,
    },
    {
      icon: 'information-circle',
      title: 'About',
      subtitle: 'App version and information',
      onPress: handleAbout,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={40} color="white" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.subscriptionBadge}>
            <Text style={styles.subscriptionText}>
              {user?.subscription || 'Free'} Plan
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="list" size={24} color="#007AFF" />
            <Text style={styles.statNumber}>{stats.activeListings}</Text>
            <Text style={styles.statLabel}>Active Listings</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={24} color="#34C759" />
            <Text style={styles.statNumber}>{stats.totalSales}</Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#FF9500" />
            <Text style={styles.statNumber}>${stats.monthlyRevenue}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>
      )}

      {/* Quick Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Settings</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={24} color="#007AFF" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingSubtitle}>Get notified about sales and offers</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon" size={24} color="#8E8E93" />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Dark Mode</Text>
              <Text style={styles.settingSubtitle}>Use dark theme</Text>
            </View>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={darkModeEnabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuItemContent}>
              <Ionicons name={item.icon as any} size={24} color="#007AFF" />
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* AI Features Highlight */}
      <View style={styles.aiSection}>
        <View style={styles.aiCard}>
          <Ionicons name="sparkles" size={32} color="#007AFF" />
          <View style={styles.aiContent}>
            <Text style={styles.aiTitle}>Dual AI Technology</Text>
            <Text style={styles.aiDescription}>
              Powered by GPT-5 + Claude for maximum accuracy and reliability
            </Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color="#FF3B30" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>OmniLister Mobile v1.0.0</Text>
        <Text style={styles.footerText}>Built with React Native</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    color: '#666',
    fontSize: 16,
    marginBottom: 10,
  },
  subscriptionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subscriptionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 15,
    alignItems: 'center',
  },
  statNumber: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: '#666',
    fontSize: 14,
  },
  menuItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    marginBottom: 10,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  menuItemText: {
    flex: 1,
    marginLeft: 15,
  },
  menuItemTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    color: '#666',
    fontSize: 14,
  },
  aiSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  aiCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,122,255,0.1)',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  aiContent: {
    flex: 1,
    marginLeft: 15,
  },
  aiTitle: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  aiDescription: {
    color: 'white',
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.1)',
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginBottom: 30,
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5,
  },
});
