import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/contexts/WebSocketContext";
import StatsCards from "@/components/StatsCards";
import MarketplaceStatus from "@/components/MarketplaceStatus";
import RealTimeJobStatus from "@/components/RealTimeJobStatus";
import MarketplaceHealthStatus from "@/components/MarketplaceHealthStatus";
import LiveNotifications from "@/components/LiveNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { Link } from "wouter";
import { Zap, TrendingUp, Target, ArrowRight, Lightbulb, Activity } from "lucide-react";
import type { Listing, Job, AuditLog } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const { isConnected, lastMessage, jobStatuses, activeJobs, marketplaceHealth, requestStatus } = useWebSocket();

  const { data: listings = [] } = useQuery<Listing[]>({
    queryKey: ['/api/listings'],
    enabled: !!user,
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
    enabled: !!user,
  });

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ['/api/audit-logs'],
    enabled: !!user,
  });

  // Fetch optimization insights for dashboard
  const { data: optimizationInsights } = useQuery<any>({
    queryKey: ['/api/optimization/insights'],
    enabled: !!user,
  });

  const { data: optimizationOpportunities } = useQuery<any>({
    queryKey: ['/api/optimization/opportunities'],
    enabled: !!user,
  });

  const recentListings = listings
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);

  const recentJobs = jobs
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Monitor your crosslisting performance across all marketplaces
              {isConnected && (
                <span className="ml-2 inline-flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                  Live
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {Object.keys(jobStatuses).length > 0 && (
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20" data-testid="badge-active-job-count">
                {Object.keys(jobStatuses).length} Active Jobs
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={requestStatus}
              disabled={!isConnected}
              data-testid="button-refresh-status"
            >
              Refresh Status
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Real-Time Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mt-8 mb-8">
        <RealTimeJobStatus />
        <MarketplaceHealthStatus />
        <LiveNotifications />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Sales Performance Chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Performance</CardTitle>
              <select className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:ring-2 focus:ring-ring">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Last 6 months</option>
                <option>Last year</option>
              </select>
            </CardHeader>
            <CardContent>
              {/* No Sales Data State */}
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">No Sales Data</h3>
                  <p className="text-sm text-muted-foreground">Start selling to see your performance metrics</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optimization Insights */}
          <Card data-testid="card-optimization-insights">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Optimization Insights
              </CardTitle>
              <Link href="/analytics?tab=optimization">
                <Button variant="outline" size="sm" data-testid="button-view-full-optimization">
                  <ArrowRight className="h-4 w-4 ml-1" />
                  View Full Analysis
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {optimizationInsights ? (
                <div className="space-y-4">
                  {/* Optimization Score */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg">
                    <div>
                      <div className="text-2xl font-bold">{optimizationInsights.overallScore || 0}/100</div>
                      <p className="text-sm text-muted-foreground">Optimization Score</p>
                    </div>
                    <div className="text-right">
                      <TrendingUp className="h-8 w-8 text-green-500 mb-1" />
                      <p className="text-xs text-muted-foreground">
                        {optimizationInsights.overallScore >= 80 ? 'Excellent' : 
                         optimizationInsights.overallScore >= 60 ? 'Good' : 'Needs Work'}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{optimizationOpportunities?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Opportunities</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        +{optimizationOpportunities?.reduce((sum: number, opp: any) => sum + opp.potentialImprovement, 0)?.toFixed(1) || 0}%
                      </div>
                      <p className="text-xs text-muted-foreground">Potential Boost</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {optimizationOpportunities?.filter((opp: any) => opp.priority === 'high').length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">High Priority</p>
                    </div>
                  </div>

                  {/* Top Opportunity */}
                  {optimizationOpportunities && optimizationOpportunities.length > 0 && (
                    <Alert data-testid="alert-top-opportunity">
                      <Lightbulb className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Top Opportunity:</strong> {optimizationOpportunities[0].description}
                        <div className="mt-2">
                          <Link href="/analytics?tab=optimization">
                            <Button size="sm" data-testid="button-apply-top-opportunity">
                              Apply Recommendation
                            </Button>
                          </Link>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-medium text-muted-foreground">Optimization Engine Starting</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Analysis will begin once you have more posting data
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Listings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Listings</CardTitle>
              <Link href="/create-listing">
                <Button variant="outline" size="sm">View all</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentListings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No listings yet. Create your first listing to get started!</p>
                    <Link href="/create-listing">
                      <Button className="mt-4">Create Listing</Button>
                    </Link>
                  </div>
                ) : (
                  recentListings.map((listing: any) => (
                    <div key={listing.id} className="flex items-center space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        {listing.images && listing.images.length > 0 ? (
                          <img 
                            src={listing.images[0]} 
                            alt={listing.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-muted-foreground text-sm">No Image</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {listing.description || "No description"}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm font-medium text-accent">
                            ${parseFloat(listing.price).toFixed(2)}
                          </span>
                          {listing.brand && (
                            <span className="text-xs text-muted-foreground">{listing.brand}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(listing.status)}>
                          {listing.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(listing.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Jobs</CardTitle>
              <Link href="/bulk-manager">
                <Button variant="outline" size="sm">View all</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No jobs yet. Jobs will appear here when you post listings.</p>
                  </div>
                ) : (
                  recentJobs.map((job: any) => (
                    <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground capitalize">
                          {job.type.replace('-', ' ')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {job.status === 'processing' && `${job.progress || 0}% complete`}
                          {job.status === 'completed' && 'Completed successfully'}
                          {job.status === 'failed' && job.errorMessage}
                          {job.status === 'pending' && 'Waiting to start'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(job.createdAt), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/create-listing">
                <Button className="w-full" data-testid="button-create-listing">
                  <i className="fas fa-plus mr-2"></i>
                  Create New Listing
                </Button>
              </Link>
              
              <Button 
                variant="secondary" 
                className="w-full" 
                data-testid="button-ai-scanner"
              >
                <i className="fas fa-robot mr-2"></i>
                AI Product Scanner
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                data-testid="button-voice-listing"
              >
                <i className="fas fa-microphone mr-2"></i>
                Voice to Listing
              </Button>
              
              <Link href="/bulk-manager">
                <Button variant="outline" className="w-full" data-testid="button-bulk-manager">
                  <i className="fas fa-tasks mr-2"></i>
                  Bulk Manager
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Marketplace Status */}
          <MarketplaceStatus />

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No recent activity</p>
                  </div>
                ) : (
                  auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-check text-accent text-sm"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{log.action.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.createdAt ? format(new Date(log.createdAt), 'h:mm a') : 'Unknown time'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Features Showcase */}
      <div className="mt-12 bg-gradient-to-r from-secondary/10 via-primary/10 to-accent/10 rounded-xl border border-border p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Revolutionary AI Features</h2>
          <p className="text-muted-foreground">Let AI handle the heavy lifting while you focus on growing your business</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border p-6 text-center">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-camera-retro text-secondary text-xl"></i>
            </div>
            <h3 className="font-semibold text-foreground mb-2">AI Product Recognition</h3>
            <p className="text-sm text-muted-foreground">Instantly identify brand, condition, size, material, and optimal pricing from photos</p>
          </div>
          
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border p-6 text-center">
            <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-microphone text-accent text-xl"></i>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Voice-to-Listing</h3>
            <p className="text-sm text-muted-foreground">Speak your product details and watch AI create professional listings instantly</p>
          </div>
          
          <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border p-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-cloud text-primary text-xl"></i>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Background Auto-Posting</h3>
            <p className="text-sm text-muted-foreground">Zero browser dependency - all operations run seamlessly in the cloud</p>
          </div>
        </div>
      </div>

      {/* Pricing Plans Preview */}
      <div className="mt-12 bg-card rounded-xl border border-border p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Transparent Flat-Rate Pricing</h2>
          <p className="text-muted-foreground">Choose the plan that fits your reselling goals</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Free Plan */}
          <div className="bg-muted/30 rounded-lg border border-border p-6 relative">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Free</h3>
              <div className="text-3xl font-bold text-foreground">$0</div>
              <p className="text-sm text-muted-foreground">Forever free</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">10 new listings/month</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">All 12 marketplaces</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">All features available</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Basic analytics</span>
              </li>
            </ul>
            
            <Button variant="outline" className="w-full" disabled={user?.plan === 'free'}>
              {user?.plan === 'free' ? 'Current Plan' : 'Get Started Free'}
            </Button>
          </div>
          
          {/* Starter Plan */}
          <div className="bg-muted/30 rounded-lg border border-border p-6 relative">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Starter</h3>
              <div className="text-3xl font-bold text-foreground">$9.99</div>
              <p className="text-sm text-muted-foreground">For casual sellers</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">50 new listings/month</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Priority support</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Bulk operations</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Enhanced analytics</span>
              </li>
            </ul>
            
            <Link href={user ? "/subscribe?plan=starter" : "/signup"}>
              <Button variant="outline" className="w-full" disabled={user?.plan === 'starter'}>
                {user?.plan === 'starter' ? 'Current Plan' : user ? 'Subscribe' : 'Get Started'}
              </Button>
            </Link>
          </div>
          
          {/* Growth Plan */}
          <div className="bg-primary/5 rounded-lg border-2 border-primary p-6 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-full">Popular</span>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Growth</h3>
              <div className="text-3xl font-bold text-foreground">$29.99</div>
              <p className="text-sm text-muted-foreground">For growing businesses</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">300 new listings/month</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Advanced AI features</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Voice-to-listing</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Competition analysis</span>
              </li>
            </ul>
            
            <Link href={user ? "/subscribe?plan=growth" : "/signup"}>
              <Button className="w-full" disabled={user?.plan === 'growth'}>
                {user?.plan === 'growth' ? 'Current Plan' : user ? 'Subscribe' : 'Get Started'}
              </Button>
            </Link>
          </div>
          
          {/* Professional Plan */}
          <div className="bg-muted/30 rounded-lg border border-border p-6 relative">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Professional</h3>
              <div className="text-3xl font-bold text-foreground">$39.99</div>
              <p className="text-sm text-muted-foreground">For power sellers</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">1,000 new listings/month</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">API access</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Smart scheduling</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Predictive analytics</span>
              </li>
            </ul>
            
            <Link href={user ? "/subscribe?plan=professional" : "/signup"}>
              <Button variant="secondary" className="w-full" disabled={user?.plan === 'professional'}>
                {user?.plan === 'professional' ? 'Current Plan' : user ? 'Subscribe' : 'Get Started'}
              </Button>
            </Link>
          </div>
          
          {/* Unlimited Plan */}
          <div className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 rounded-lg border-2 border-primary/50 p-6 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-primary to-purple-600 text-primary-foreground px-3 py-1 text-xs font-medium rounded-full">Best Value</span>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Unlimited</h3>
              <div className="text-3xl font-bold text-foreground">$44.99</div>
              <p className="text-sm text-muted-foreground">For scaling fast</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Unlimited listings</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Everything included</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">White-glove support</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Custom integrations</span>
              </li>
            </ul>
            
            <Link href={user ? "/subscribe?plan=unlimited" : "/signup"}>
              <Button className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90" disabled={user?.plan === 'unlimited'}>
                {user?.plan === 'unlimited' ? 'Current Plan' : user ? 'Subscribe' : 'Get Started'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
