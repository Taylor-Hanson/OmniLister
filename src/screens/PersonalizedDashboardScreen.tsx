// Personalized Dashboard Screen - Targeted experiences and user segmentation

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { personalizationService, UserProfile, PersonalizedContent, UserSegment } from '../services/personalizationService';

export default function PersonalizedDashboardScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent[]>([]);
  const [userSegments, setUserSegments] = useState<UserSegment[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadPersonalizedData();
  }, []);

  const loadPersonalizedData = async () => {
    try {
      // Mock user ID - in real app, get from auth context
      const userId = 'user_001';
      
      const profile = personalizationService.getUserProfile(userId);
      setUserProfile(profile);

      const content = await personalizationService.getPersonalizedContent(userId);
      setPersonalizedContent(content);

      const segments = personalizationService.getUserSegments();
      setUserSegments(segments);

      const userRecommendations = await personalizationService.getUserRecommendations(userId);
      setRecommendations(userRecommendations);
    } catch (error) {
      console.error('Failed to load personalized data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPersonalizedData();
    setIsRefreshing(false);
  };

  const handleContentAction = (content: PersonalizedContent) => {
    Alert.alert(
      content.title,
      content.description,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: content.actionText, onPress: () => {
          // In real app, navigate to action URL
          console.log('Navigate to:', content.actionUrl);
        }}
      ]
    );
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'new_user': return '#FF9500';
      case 'reseller': return '#34C759';
      case 'business': return '#007AFF';
      case 'enterprise': return '#AF52DE';
      default: return '#8E8E93';
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'tip': return 'bulb';
      case 'feature': return 'star';
      case 'promotion': return 'gift';
      case 'reminder': return 'time';
      case 'achievement': return 'trophy';
      default: return 'information-circle';
    }
  };

  const getContentColor = (type: string) => {
    switch (type) {
      case 'tip': return '#FF9500';
      case 'feature': return '#007AFF';
      case 'promotion': return '#34C759';
      case 'reminder': return '#FF3B30';
      case 'achievement': return '#AF52DE';
      default: return '#8E8E93';
    }
  };

  const renderWelcomeSection = () => {
    if (!userProfile) return null;

    const segment = userSegments.find(s => s.id === userProfile.segment);
    
    return (
      <View style={styles.section}>
        <View style={styles.welcomeCard}>
          <LinearGradient
            colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
            style={styles.welcomeGradient}
          >
            <View style={styles.welcomeHeader}>
              <View style={styles.welcomeInfo}>
                <Text style={styles.welcomeTitle}>Welcome back, {userProfile.name}!</Text>
                <Text style={styles.welcomeSubtitle}>
                  {segment?.description || 'Personalized for you'}
                </Text>
              </View>
              <View style={[styles.segmentBadge, { backgroundColor: getSegmentColor(userProfile.segment) }]}>
                <Text style={styles.segmentBadgeText}>{userProfile.segment.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.performanceGrid}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>{userProfile.performance.totalListings}</Text>
                <Text style={styles.performanceLabel}>Listings</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>{userProfile.performance.totalSales}</Text>
                <Text style={styles.performanceLabel}>Sales</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>${userProfile.performance.totalRevenue.toFixed(0)}</Text>
                <Text style={styles.performanceLabel}>Revenue</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>{userProfile.performance.averageRating.toFixed(1)}</Text>
                <Text style={styles.performanceLabel}>Rating</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const renderPersonalizedContent = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Personalized for You</Text>
      {personalizedContent.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="sparkles" size={48} color="#666" />
          <Text style={styles.emptyStateText}>No personalized content</Text>
          <Text style={styles.emptyStateSubtext}>
            Complete your profile to get personalized recommendations
          </Text>
        </View>
      ) : (
        personalizedContent.map((content) => (
          <TouchableOpacity
            key={content.id}
            style={styles.contentCard}
            onPress={() => handleContentAction(content)}
          >
            <View style={styles.contentHeader}>
              <View style={[styles.contentIcon, { backgroundColor: getContentColor(content.type) }]}>
                <Ionicons name={getContentIcon(content.type) as any} size={20} color="white" />
              </View>
              <View style={styles.contentInfo}>
                <Text style={styles.contentTitle}>{content.title}</Text>
                <Text style={styles.contentDescription}>{content.description}</Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getContentColor(content.type) }]}>
                <Text style={styles.priorityBadgeText}>{content.priority.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.contentAction}>
              <Text style={styles.contentActionText}>{content.actionText}</Text>
              <Ionicons name="arrow-forward" size={16} color="#007AFF" />
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderRecommendations = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI Recommendations</Text>
      <View style={styles.recommendationsCard}>
        <LinearGradient
          colors={['rgba(52,199,89,0.1)', 'rgba(52,199,89,0.05)']}
          style={styles.recommendationsGradient}
        >
          <View style={styles.recommendationsHeader}>
            <Ionicons name="sparkles" size={24} color="#34C759" />
            <Text style={styles.recommendationsTitle}>Smart Suggestions</Text>
          </View>
          
          {recommendations.length === 0 ? (
            <Text style={styles.noRecommendationsText}>
              Complete more activities to get personalized recommendations
            </Text>
          ) : (
            recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))
          )}
        </LinearGradient>
      </View>
    </View>
  );

  const renderUserSegments = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>User Segments</Text>
      <View style={styles.segmentsGrid}>
        {userSegments.map((segment) => (
          <View key={segment.id} style={styles.segmentCard}>
            <View style={[styles.segmentIcon, { backgroundColor: getSegmentColor(segment.id) }]}>
              <Ionicons name="people" size={20} color="white" />
            </View>
            <View style={styles.segmentInfo}>
              <Text style={styles.segmentName}>{segment.name}</Text>
              <Text style={styles.segmentDescription}>{segment.description}</Text>
              <Text style={styles.segmentSize}>{segment.size} users</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="person" size={24} color="#007AFF" />
          <Text style={styles.actionTitle}>Update Profile</Text>
          <Text style={styles.actionSubtitle}>Personalize your experience</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="settings" size={24} color="#34C759" />
          <Text style={styles.actionTitle}>Preferences</Text>
          <Text style={styles.actionSubtitle}>Customize notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="analytics" size={24} color="#FF9500" />
          <Text style={styles.actionTitle}>View Analytics</Text>
          <Text style={styles.actionSubtitle}>Track your performance</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="help-circle" size={24} color="#AF52DE" />
          <Text style={styles.actionTitle}>Get Help</Text>
          <Text style={styles.actionSubtitle}>Personalized support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Personalized Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Tailored experiences based on your behavior and goals
        </Text>
      </View>

      {/* Welcome Section */}
      {renderWelcomeSection()}

      {/* Personalized Content */}
      {renderPersonalizedContent()}

      {/* AI Recommendations */}
      {renderRecommendations()}

      {/* User Segments */}
      {renderUserSegments()}

      {/* Quick Actions */}
      {renderQuickActions()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  welcomeCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  welcomeGradient: {
    padding: 20,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  welcomeSubtitle: {
    color: '#666',
    fontSize: 14,
  },
  segmentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  segmentBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  performanceLabel: {
    color: '#666',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  contentCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  contentDescription: {
    color: '#666',
    fontSize: 14,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  priorityBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentActionText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recommendationsCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  recommendationsGradient: {
    padding: 20,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recommendationsTitle: {
    color: '#34C759',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  noRecommendationsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  recommendationText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  segmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  segmentCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  segmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  segmentInfo: {
    flex: 1,
  },
  segmentName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  segmentDescription: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5,
  },
  segmentSize: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  actionTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
  },
  actionSubtitle: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});
