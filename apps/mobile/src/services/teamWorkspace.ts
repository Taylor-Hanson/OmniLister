// Team Workspace - Multi-user collaboration and management

import { aiService } from './aiService';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'manager' | 'seller' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  joinedAt: Date;
  lastActive: Date;
  permissions: {
    canCreateListings: boolean;
    canEditListings: boolean;
    canDeleteListings: boolean;
    canManageInventory: boolean;
    canViewAnalytics: boolean;
    canManageTeam: boolean;
    canManageBilling: boolean;
    canAccessAPIs: boolean;
  };
  performance: {
    listingsCreated: number;
    salesGenerated: number;
    revenueGenerated: number;
    averageRating: number;
  };
}

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  plan: 'starter' | 'pro' | 'business' | 'enterprise';
  memberCount: number;
  maxMembers: number;
  settings: {
    requireApproval: boolean;
    allowCrossPosting: boolean;
    defaultMarketplaces: string[];
    notificationSettings: {
      newListings: boolean;
      sales: boolean;
      offers: boolean;
      teamActivity: boolean;
    };
  };
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  enabled: boolean;
  steps: {
    id: string;
    name: string;
    approverRole: string;
    required: boolean;
    timeout: number; // hours
  }[];
  applicableTo: {
    marketplaces: string[];
    categories: string[];
    priceRange: {
      min: number;
      max: number;
    };
  };
}

export interface TeamActivity {
  id: string;
  type: 'listing_created' | 'listing_approved' | 'listing_rejected' | 'sale_made' | 'member_joined' | 'member_left' | 'permission_changed';
  userId: string;
  userName: string;
  description: string;
  metadata: any;
  timestamp: Date;
}

export interface TeamAnalytics {
  totalMembers: number;
  activeMembers: number;
  totalListings: number;
  totalSales: number;
  totalRevenue: number;
  averagePerformance: {
    listingsPerMember: number;
    salesPerMember: number;
    revenuePerMember: number;
  };
  topPerformers: {
    memberId: string;
    memberName: string;
    performance: number;
    metric: string;
  }[];
  teamGrowth: {
    date: string;
    members: number;
    listings: number;
    revenue: number;
  }[];
}

export interface Commission {
  id: string;
  memberId: string;
  memberName: string;
  period: {
    start: Date;
    end: Date;
  };
  sales: number;
  revenue: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid';
  paidAt?: Date;
}

class TeamWorkspaceService {
  private currentTeam: Team | null = null;
  private teamMembers: TeamMember[] = [];
  private approvalWorkflows: ApprovalWorkflow[] = [];
  private teamActivities: TeamActivity[] = [];
  private commissions: Commission[] = [];

  // Initialize team workspace
  async initialize() {
    try {
      // Load team data
      await this.loadTeamData();
      
      // Load team members
      await this.loadTeamMembers();
      
      // Load approval workflows
      await this.loadApprovalWorkflows();
      
      // Load team activities
      await this.loadTeamActivities();
      
      console.log('Team workspace initialized');
    } catch (error) {
      console.error('Failed to initialize team workspace:', error);
    }
  }

  // Load team data
  private async loadTeamData(): Promise<void> {
    // Mock implementation - in real app, load from database
    this.currentTeam = {
      id: 'team_001',
      name: 'OmniLister Team',
      ownerId: 'user_001',
      createdAt: new Date('2024-01-01'),
      plan: 'business',
      memberCount: 5,
      maxMembers: 10,
      settings: {
        requireApproval: true,
        allowCrossPosting: true,
        defaultMarketplaces: ['eBay', 'Amazon', 'Poshmark'],
        notificationSettings: {
          newListings: true,
          sales: true,
          offers: true,
          teamActivity: true,
        },
      },
    };
  }

  // Load team members
  private async loadTeamMembers(): Promise<void> {
    // Mock implementation - in real app, load from database
    this.teamMembers = [
      {
        id: 'member_001',
        email: 'john@example.com',
        name: 'John Smith',
        role: 'owner',
        status: 'active',
        joinedAt: new Date('2024-01-01'),
        lastActive: new Date(),
        permissions: {
          canCreateListings: true,
          canEditListings: true,
          canDeleteListings: true,
          canManageInventory: true,
          canViewAnalytics: true,
          canManageTeam: true,
          canManageBilling: true,
          canAccessAPIs: true,
        },
        performance: {
          listingsCreated: 45,
          salesGenerated: 23,
          revenueGenerated: 3450.00,
          averageRating: 4.8,
        },
      },
      {
        id: 'member_002',
        email: 'sarah@example.com',
        name: 'Sarah Johnson',
        role: 'manager',
        status: 'active',
        joinedAt: new Date('2024-01-15'),
        lastActive: new Date(),
        permissions: {
          canCreateListings: true,
          canEditListings: true,
          canDeleteListings: false,
          canManageInventory: true,
          canViewAnalytics: true,
          canManageTeam: false,
          canManageBilling: false,
          canAccessAPIs: false,
        },
        performance: {
          listingsCreated: 32,
          salesGenerated: 18,
          revenueGenerated: 2100.00,
          averageRating: 4.6,
        },
      },
      {
        id: 'member_003',
        email: 'mike@example.com',
        name: 'Mike Wilson',
        role: 'seller',
        status: 'active',
        joinedAt: new Date('2024-02-01'),
        lastActive: new Date(),
        permissions: {
          canCreateListings: true,
          canEditListings: true,
          canDeleteListings: false,
          canManageInventory: false,
          canViewAnalytics: false,
          canManageTeam: false,
          canManageBilling: false,
          canAccessAPIs: false,
        },
        performance: {
          listingsCreated: 28,
          salesGenerated: 15,
          revenueGenerated: 1800.00,
          averageRating: 4.4,
        },
      },
    ];
  }

  // Load approval workflows
  private async loadApprovalWorkflows(): Promise<void> {
    // Mock implementation - in real app, load from database
    this.approvalWorkflows = [
      {
        id: 'workflow_001',
        name: 'High-Value Listings',
        enabled: true,
        steps: [
          {
            id: 'step_001',
            name: 'Manager Review',
            approverRole: 'manager',
            required: true,
            timeout: 24,
          },
          {
            id: 'step_002',
            name: 'Owner Approval',
            approverRole: 'owner',
            required: true,
            timeout: 48,
          },
        ],
        applicableTo: {
          marketplaces: ['Amazon', 'eBay'],
          categories: ['Electronics', 'Jewelry'],
          priceRange: {
            min: 100,
            max: 10000,
          },
        },
      },
    ];
  }

  // Load team activities
  private async loadTeamActivities(): Promise<void> {
    // Mock implementation - in real app, load from database
    this.teamActivities = [
      {
        id: 'activity_001',
        type: 'listing_created',
        userId: 'member_002',
        userName: 'Sarah Johnson',
        description: 'Created new listing: iPhone 13 128GB',
        metadata: { listingId: 'listing_001', price: 650 },
        timestamp: new Date(),
      },
      {
        id: 'activity_002',
        type: 'sale_made',
        userId: 'member_001',
        userName: 'John Smith',
        description: 'Made sale: MacBook Pro for $1,200',
        metadata: { saleId: 'sale_001', revenue: 1200 },
        timestamp: new Date(),
      },
    ];
  }

  // Get current team
  getCurrentTeam(): Team | null {
    return this.currentTeam;
  }

  // Get team members
  getTeamMembers(): TeamMember[] {
    return this.teamMembers;
  }

  // Get team member by ID
  getTeamMember(memberId: string): TeamMember | null {
    return this.teamMembers.find(member => member.id === memberId) || null;
  }

  // Invite team member
  async inviteTeamMember(email: string, role: TeamMember['role']): Promise<boolean> {
    try {
      // Mock implementation - in real app, send invitation email
      const newMember: TeamMember = {
        id: `member_${Date.now()}`,
        email,
        name: email.split('@')[0],
        role,
        status: 'pending',
        joinedAt: new Date(),
        lastActive: new Date(),
        permissions: this.getDefaultPermissions(role),
        performance: {
          listingsCreated: 0,
          salesGenerated: 0,
          revenueGenerated: 0,
          averageRating: 0,
        },
      };

      this.teamMembers.push(newMember);
      
      // Add team activity
      this.addTeamActivity('member_joined', 'System', `Invited ${email} as ${role}`);
      
      console.log(`Invited ${email} as ${role}`);
      return true;
    } catch (error) {
      console.error('Failed to invite team member:', error);
      return false;
    }
  }

  // Get default permissions for role
  private getDefaultPermissions(role: TeamMember['role']): TeamMember['permissions'] {
    const permissions = {
      canCreateListings: false,
      canEditListings: false,
      canDeleteListings: false,
      canManageInventory: false,
      canViewAnalytics: false,
      canManageTeam: false,
      canManageBilling: false,
      canAccessAPIs: false,
    };

    switch (role) {
      case 'owner':
        return {
          canCreateListings: true,
          canEditListings: true,
          canDeleteListings: true,
          canManageInventory: true,
          canViewAnalytics: true,
          canManageTeam: true,
          canManageBilling: true,
          canAccessAPIs: true,
        };
      case 'admin':
        return {
          canCreateListings: true,
          canEditListings: true,
          canDeleteListings: true,
          canManageInventory: true,
          canViewAnalytics: true,
          canManageTeam: true,
          canManageBilling: false,
          canAccessAPIs: true,
        };
      case 'manager':
        return {
          canCreateListings: true,
          canEditListings: true,
          canDeleteListings: false,
          canManageInventory: true,
          canViewAnalytics: true,
          canManageTeam: false,
          canManageBilling: false,
          canAccessAPIs: false,
        };
      case 'seller':
        return {
          canCreateListings: true,
          canEditListings: true,
          canDeleteListings: false,
          canManageInventory: false,
          canViewAnalytics: false,
          canManageTeam: false,
          canManageBilling: false,
          canAccessAPIs: false,
        };
      case 'viewer':
        return {
          canCreateListings: false,
          canEditListings: false,
          canDeleteListings: false,
          canManageInventory: false,
          canViewAnalytics: true,
          canManageTeam: false,
          canManageBilling: false,
          canAccessAPIs: false,
        };
      default:
        return permissions;
    }
  }

  // Update team member role
  async updateTeamMemberRole(memberId: string, newRole: TeamMember['role']): Promise<boolean> {
    try {
      const member = this.getTeamMember(memberId);
      if (!member) return false;

      const oldRole = member.role;
      member.role = newRole;
      member.permissions = this.getDefaultPermissions(newRole);

      // Add team activity
      this.addTeamActivity('permission_changed', 'System', `Changed ${member.name}'s role from ${oldRole} to ${newRole}`);

      console.log(`Updated ${member.name}'s role to ${newRole}`);
      return true;
    } catch (error) {
      console.error('Failed to update team member role:', error);
      return false;
    }
  }

  // Remove team member
  async removeTeamMember(memberId: string): Promise<boolean> {
    try {
      const member = this.getTeamMember(memberId);
      if (!member) return false;

      const memberIndex = this.teamMembers.findIndex(m => m.id === memberId);
      if (memberIndex === -1) return false;

      this.teamMembers.splice(memberIndex, 1);

      // Add team activity
      this.addTeamActivity('member_left', 'System', `${member.name} left the team`);

      console.log(`Removed ${member.name} from team`);
      return true;
    } catch (error) {
      console.error('Failed to remove team member:', error);
      return false;
    }
  }

  // Add team activity
  private addTeamActivity(type: TeamActivity['type'], userId: string, description: string, metadata?: any): void {
    const activity: TeamActivity = {
      id: `activity_${Date.now()}`,
      type,
      userId,
      userName: this.getTeamMember(userId)?.name || 'System',
      description,
      metadata: metadata || {},
      timestamp: new Date(),
    };

    this.teamActivities.unshift(activity);
    
    // Keep only last 100 activities
    if (this.teamActivities.length > 100) {
      this.teamActivities = this.teamActivities.slice(0, 100);
    }
  }

  // Get team activities
  getTeamActivities(limit: number = 20): TeamActivity[] {
    return this.teamActivities.slice(0, limit);
  }

  // Get approval workflows
  getApprovalWorkflows(): ApprovalWorkflow[] {
    return this.approvalWorkflows;
  }

  // Create approval workflow
  async createApprovalWorkflow(workflow: Omit<ApprovalWorkflow, 'id'>): Promise<string> {
    const newWorkflow: ApprovalWorkflow = {
      ...workflow,
      id: `workflow_${Date.now()}`,
    };

    this.approvalWorkflows.push(newWorkflow);
    return newWorkflow.id;
  }

  // Update approval workflow
  async updateApprovalWorkflow(workflowId: string, updates: Partial<ApprovalWorkflow>): Promise<boolean> {
    const workflowIndex = this.approvalWorkflows.findIndex(w => w.id === workflowId);
    if (workflowIndex === -1) return false;

    this.approvalWorkflows[workflowIndex] = { ...this.approvalWorkflows[workflowIndex], ...updates };
    return true;
  }

  // Delete approval workflow
  async deleteApprovalWorkflow(workflowId: string): Promise<boolean> {
    const workflowIndex = this.approvalWorkflows.findIndex(w => w.id === workflowId);
    if (workflowIndex === -1) return false;

    this.approvalWorkflows.splice(workflowIndex, 1);
    return true;
  }

  // Get team analytics
  async getTeamAnalytics(): Promise<TeamAnalytics> {
    const totalMembers = this.teamMembers.length;
    const activeMembers = this.teamMembers.filter(m => m.status === 'active').length;
    
    const totalListings = this.teamMembers.reduce((sum, m) => sum + m.performance.listingsCreated, 0);
    const totalSales = this.teamMembers.reduce((sum, m) => sum + m.performance.salesGenerated, 0);
    const totalRevenue = this.teamMembers.reduce((sum, m) => sum + m.performance.revenueGenerated, 0);

    const averagePerformance = {
      listingsPerMember: totalListings / totalMembers,
      salesPerMember: totalSales / totalMembers,
      revenuePerMember: totalRevenue / totalMembers,
    };

    const topPerformers = this.teamMembers
      .map(member => ({
        memberId: member.id,
        memberName: member.name,
        performance: member.performance.revenueGenerated,
        metric: 'Revenue',
      }))
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 3);

    const teamGrowth = [
      { date: '2024-01-01', members: 1, listings: 0, revenue: 0 },
      { date: '2024-01-15', members: 2, listings: 15, revenue: 500 },
      { date: '2024-02-01', members: 3, listings: 35, revenue: 1200 },
      { date: '2024-02-15', members: 4, listings: 60, revenue: 2100 },
      { date: '2024-03-01', members: 5, listings: 85, revenue: 3200 },
    ];

    return {
      totalMembers,
      activeMembers,
      totalListings,
      totalSales,
      totalRevenue,
      averagePerformance,
      topPerformers,
      teamGrowth,
    };
  }

  // Calculate commissions
  async calculateCommissions(period: { start: Date; end: Date }): Promise<Commission[]> {
    const commissions: Commission[] = [];

    for (const member of this.teamMembers) {
      if (member.role === 'seller' || member.role === 'manager') {
        const commissionRate = member.role === 'manager' ? 0.05 : 0.03; // 5% for managers, 3% for sellers
        const revenue = member.performance.revenueGenerated;
        const commissionAmount = revenue * commissionRate;

        const commission: Commission = {
          id: `commission_${member.id}_${period.start.getTime()}`,
          memberId: member.id,
          memberName: member.name,
          period,
          sales: member.performance.salesGenerated,
          revenue,
          commissionRate,
          commissionAmount,
          status: 'pending',
        };

        commissions.push(commission);
      }
    }

    this.commissions = commissions;
    return commissions;
  }

  // Get commissions
  getCommissions(): Commission[] {
    return this.commissions;
  }

  // Approve commission
  async approveCommission(commissionId: string): Promise<boolean> {
    const commission = this.commissions.find(c => c.id === commissionId);
    if (!commission) return false;

    commission.status = 'approved';
    return true;
  }

  // Pay commission
  async payCommission(commissionId: string): Promise<boolean> {
    const commission = this.commissions.find(c => c.id === commissionId);
    if (!commission) return false;

    commission.status = 'paid';
    commission.paidAt = new Date();
    return true;
  }

  // Update team settings
  async updateTeamSettings(settings: Partial<Team['settings']>): Promise<boolean> {
    if (!this.currentTeam) return false;

    this.currentTeam.settings = { ...this.currentTeam.settings, ...settings };
    return true;
  }

  // Get team member permissions
  getTeamMemberPermissions(memberId: string): TeamMember['permissions'] | null {
    const member = this.getTeamMember(memberId);
    return member ? member.permissions : null;
  }

  // Check if user has permission
  hasPermission(memberId: string, permission: keyof TeamMember['permissions']): boolean {
    const permissions = this.getTeamMemberPermissions(memberId);
    return permissions ? permissions[permission] : false;
  }
}

export const teamWorkspaceService = new TeamWorkspaceService();