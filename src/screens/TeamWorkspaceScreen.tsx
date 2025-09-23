// Team Workspace Screen - Multi-user collaboration and management

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { teamWorkspaceService, Team, TeamMember, TeamAnalytics, TeamActivity, Commission } from '../services/teamWorkspace';

export default function TeamWorkspaceScreen() {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const teamData = teamWorkspaceService.getCurrentTeam();
      setTeam(teamData);

      const teamMembers = teamWorkspaceService.getTeamMembers();
      setMembers(teamMembers);

      const teamAnalytics = await teamWorkspaceService.getTeamAnalytics();
      setAnalytics(teamAnalytics);

      const teamActivities = teamWorkspaceService.getTeamActivities(10);
      setActivities(teamActivities);

      const teamCommissions = teamWorkspaceService.getCommissions();
      setCommissions(teamCommissions);
    } catch (error) {
      console.error('Failed to load team data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTeamData();
    setIsRefreshing(false);
  };

  const inviteMember = () => {
    Alert.alert(
      'Invite Team Member',
      'Enter email address and select role:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Invite as Seller', onPress: () => inviteMemberWithRole('seller') },
        { text: 'Invite as Manager', onPress: () => inviteMemberWithRole('manager') },
        { text: 'Invite as Admin', onPress: () => inviteMemberWithRole('admin') },
      ]
    );
  };

  const inviteMemberWithRole = async (role: TeamMember['role']) => {
    try {
      const success = await teamWorkspaceService.inviteTeamMember('newmember@example.com', role);
      if (success) {
        Alert.alert('Success', `Invitation sent for ${role} role`);
        await loadTeamData();
      } else {
        Alert.alert('Error', 'Failed to send invitation');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  const updateMemberRole = async (memberId: string, currentRole: TeamMember['role']) => {
    const roles: TeamMember['role'][] = ['viewer', 'seller', 'manager', 'admin', 'owner'];
    const currentIndex = roles.indexOf(currentRole);
    const nextRole = roles[currentIndex + 1] || roles[0];

    try {
      const success = await teamWorkspaceService.updateTeamMemberRole(memberId, nextRole);
      if (success) {
        Alert.alert('Success', `Updated role to ${nextRole}`);
        await loadTeamData();
      } else {
        Alert.alert('Error', 'Failed to update role');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const removeMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${memberName} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          const success = await teamWorkspaceService.removeTeamMember(memberId);
          if (success) {
            Alert.alert('Success', 'Team member removed');
            await loadTeamData();
          } else {
            Alert.alert('Error', 'Failed to remove team member');
          }
        }}
      ]
    );
  };

  const calculateCommissions = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);

      const newCommissions = await teamWorkspaceService.calculateCommissions({ startDate, endDate });
      setCommissions(newCommissions);
      Alert.alert('Success', 'Commissions calculated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate commissions');
    }
  };

  const getRoleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'owner': return '#FF3B30';
      case 'admin': return '#FF9500';
      case 'manager': return '#007AFF';
      case 'seller': return '#34C759';
      case 'viewer': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'active': return '#34C759';
      case 'inactive': return '#FF3B30';
      case 'pending': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const renderTeamOverview = () => {
    if (!team || !analytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Overview</Text>
        <View style={styles.overviewCard}>
          <LinearGradient
            colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
            style={styles.overviewGradient}
          >
            <View style={styles.overviewHeader}>
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamPlan}>{team.plan.toUpperCase()}</Text>
            </View>
            <View style={styles.overviewStats}>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatValue}>{analytics.totalMembers}</Text>
                <Text style={styles.overviewStatLabel}>Members</Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatValue}>{analytics.totalListings}</Text>
                <Text style={styles.overviewStatLabel}>Listings</Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatValue}>{analytics.totalSales}</Text>
                <Text style={styles.overviewStatLabel}>Sales</Text>
              </View>
              <View style={styles.overviewStat}>
                <Text style={styles.overviewStatValue}>${analytics.totalRevenue.toFixed(0)}</Text>
                <Text style={styles.overviewStatLabel}>Revenue</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const renderTeamMembers = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Team Members</Text>
        <TouchableOpacity style={styles.inviteButton} onPress={inviteMember}>
          <Ionicons name="person-add" size={20} color="white" />
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>
      
      {members.map((member) => (
        <View key={member.id} style={styles.memberCard}>
          <View style={styles.memberHeader}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
            </View>
            <View style={styles.memberActions}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) }]}>
                <Text style={styles.roleBadgeText}>{member.role.toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member.status) }]}>
                <Text style={styles.statusBadgeText}>{member.status.toUpperCase()}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.memberPerformance}>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{member.performance.listingsCreated}</Text>
              <Text style={styles.performanceLabel}>Listings</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{member.performance.salesGenerated}</Text>
              <Text style={styles.performanceLabel}>Sales</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>${member.performance.revenueGenerated.toFixed(0)}</Text>
              <Text style={styles.performanceLabel}>Revenue</Text>
            </View>
            <View style={styles.performanceItem}>
              <Text style={styles.performanceValue}>{member.performance.averageRating.toFixed(1)}</Text>
              <Text style={styles.performanceLabel}>Rating</Text>
            </View>
          </View>
          
          <View style={styles.memberActions}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => updateMemberRole(member.id, member.role)}
            >
              <Ionicons name="person" size={16} color="#007AFF" />
              <Text style={styles.actionButtonText}>Change Role</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => removeMember(member.id, member.name)}
            >
              <Ionicons name="trash" size={16} color="#FF3B30" />
              <Text style={styles.actionButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderTeamAnalytics = () => {
    if (!analytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Analytics</Text>
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <LinearGradient
              colors={['rgba(52,199,89,0.1)', 'rgba(52,199,89,0.05)']}
              style={styles.analyticsGradient}
            >
              <Ionicons name="people" size={24} color="#34C759" />
              <Text style={styles.analyticsValue}>{analytics.activeMembers}</Text>
              <Text style={styles.analyticsLabel}>Active Members</Text>
            </LinearGradient>
          </View>

          <View style={styles.analyticsCard}>
            <LinearGradient
              colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
              style={styles.analyticsGradient}
            >
              <Ionicons name="list" size={24} color="#007AFF" />
              <Text style={styles.analyticsValue}>{analytics.averagePerformance.listingsPerMember.toFixed(1)}</Text>
              <Text style={styles.analyticsLabel}>Avg Listings</Text>
            </LinearGradient>
          </View>

          <View style={styles.analyticsCard}>
            <LinearGradient
              colors={['rgba(255,149,0,0.1)', 'rgba(255,149,0,0.05)']}
              style={styles.analyticsGradient}
            >
              <Ionicons name="trending-up" size={24} color="#FF9500" />
              <Text style={styles.analyticsValue}>{analytics.averagePerformance.salesPerMember.toFixed(1)}</Text>
              <Text style={styles.analyticsLabel}>Avg Sales</Text>
            </LinearGradient>
          </View>

          <View style={styles.analyticsCard}>
            <LinearGradient
              colors={['rgba(175,82,222,0.1)', 'rgba(175,82,222,0.05)']}
              style={styles.analyticsGradient}
            >
              <Ionicons name="cash" size={24} color="#AF52DE" />
              <Text style={styles.analyticsValue}>${analytics.averagePerformance.revenuePerMember.toFixed(0)}</Text>
              <Text style={styles.analyticsLabel}>Avg Revenue</Text>
            </LinearGradient>
          </View>
        </View>
      </View>
    );
  };

  const renderTopPerformers = () => {
    if (!analytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Performers</Text>
        {analytics.topPerformers.map((performer, index) => (
          <View key={performer.memberId} style={styles.performerCard}>
            <View style={styles.performerRank}>
              <Text style={styles.performerRankText}>#{index + 1}</Text>
            </View>
            <View style={styles.performerInfo}>
              <Text style={styles.performerName}>{performer.memberName}</Text>
              <Text style={styles.performerMetric}>{performer.metric}: ${performer.performance.toFixed(0)}</Text>
            </View>
            <View style={styles.performerBadge}>
              <Ionicons name="trophy" size={20} color="#FF9500" />
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTeamActivities = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time" size={48} color="#666" />
          <Text style={styles.emptyStateText}>No recent activity</Text>
        </View>
      ) : (
        activities.map((activity) => (
          <View key={activity.id} style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons 
                name={
                  activity.type === 'listing_created' ? 'add-circle' :
                  activity.type === 'sale_made' ? 'cash' :
                  activity.type === 'member_joined' ? 'person-add' :
                  'notifications'
                } 
                size={20} 
                color="#007AFF" 
              />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityDescription}>{activity.description}</Text>
              <Text style={styles.activityTime}>
                {activity.userName} • {activity.timestamp.toLocaleString()}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderCommissions = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Commissions</Text>
        <TouchableOpacity style={styles.calculateButton} onPress={calculateCommissions}>
          <Ionicons name="calculator" size={20} color="white" />
          <Text style={styles.calculateButtonText}>Calculate</Text>
        </TouchableOpacity>
      </View>
      
      {commissions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cash" size={48} color="#666" />
          <Text style={styles.emptyStateText}>No commissions calculated</Text>
          <Text style={styles.emptyStateSubtext}>Calculate commissions for the current period</Text>
        </View>
      ) : (
        commissions.map((commission) => (
          <View key={commission.id} style={styles.commissionCard}>
            <View style={styles.commissionHeader}>
              <Text style={styles.commissionMember}>{commission.memberName}</Text>
              <View style={[styles.commissionStatus, { backgroundColor: getStatusColor(commission.status as any) }]}>
                <Text style={styles.commissionStatusText}>{commission.status.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.commissionDetails}>
              <View style={styles.commissionDetail}>
                <Text style={styles.commissionDetailLabel}>Revenue:</Text>
                <Text style={styles.commissionDetailValue}>${commission.revenue.toFixed(2)}</Text>
              </View>
              <View style={styles.commissionDetail}>
                <Text style={styles.commissionDetailLabel}>Rate:</Text>
                <Text style={styles.commissionDetailValue}>{(commission.commissionRate * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.commissionDetail}>
                <Text style={styles.commissionDetailLabel}>Amount:</Text>
                <Text style={styles.commissionDetailValue}>${commission.commissionAmount.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        ))
      )}
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
        <Text style={styles.headerTitle}>Team Workspace</Text>
        <Text style={styles.headerSubtitle}>
          Multi-user collaboration and management
        </Text>
      </View>

      {/* Team Overview */}
      {renderTeamOverview()}

      {/* Team Analytics */}
      {renderTeamAnalytics()}

      {/* Team Members */}
      {renderTeamMembers()}

      {/* Top Performers */}
      {renderTopPerformers()}

      {/* Team Activities */}
      {renderTeamActivities()}

      {/* Commissions */}
      {renderCommissions()}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  inviteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  calculateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  overviewCard: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  overviewGradient: {
    padding: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  teamName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  teamPlan: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewStatValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  overviewStatLabel: {
    color: '#666',
    fontSize: 12,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  analyticsGradient: {
    padding: 20,
    alignItems: 'center',
  },
  analyticsValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  analyticsLabel: {
    color: '#666',
    fontSize: 12,
  },
  memberCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  memberEmail: {
    color: '#666',
    fontSize: 14,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  roleBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberPerformance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  performanceLabel: {
    color: '#666',
    fontSize: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  performerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  performerRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  performerRankText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  performerMetric: {
    color: '#666',
    fontSize: 14,
  },
  performerBadge: {
    marginLeft: 15,
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
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  activityTime: {
    color: '#666',
    fontSize: 12,
  },
  commissionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  commissionMember: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  commissionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  commissionStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commissionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commissionDetail: {
    alignItems: 'center',
  },
  commissionDetailLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 5,
  },
  commissionDetailValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
