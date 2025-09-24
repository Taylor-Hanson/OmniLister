// Authentication Screen - Login and Registration

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!isLogin && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await register({ email, password, name });
      }

      if (!result.success) {
        Alert.alert('Error', result.error || 'Authentication failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="sparkles" size={48} color="#007AFF" />
          </View>
          <Text style={styles.title}>OmniLister</Text>
          <Text style={styles.subtitle}>
            Cross-list with dual AI technology
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, isLogin && styles.activeTab]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, !isLogin && styles.activeTab]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#666"
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#666"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLogin ? 'Login' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          {isLogin && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Powered by Dual AI Technology</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="camera" size={20} color="#007AFF" />
              <Text style={styles.featureText}>AI Product Recognition</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="share" size={20} color="#007AFF" />
              <Text style={styles.featureText}>Cross-Platform Posting</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="sparkles" size={20} color="#007AFF" />
              <Text style={styles.featureText}>GPT-5 + Claude AI</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="notifications" size={20} color="#007AFF" />
              <Text style={styles.featureText}>Real-time Notifications</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: 'white',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
  },
  featuresContainer: {
    alignItems: 'center',
  },
  featuresTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,122,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    margin: 5,
  },
  featureText: {
    color: 'white',
    fontSize: 12,
    marginLeft: 6,
  },
});
