import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import StatsCards from "@/components/StatsCards";
import MarketplaceStatus from "@/components/MarketplaceStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { isConnected, lastMessage } = useWebSocket();

  const { data: listings = [] } = useQuery({
    queryKey: ['/api/listings'],
    enabled: !!user,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/jobs'],
    enabled: !!user,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['/api/audit-logs'],
    enabled: !!user,
  });

  const recentListings = listings
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentJobs = jobs
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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

      {/* Stats Cards */}
      <StatsCards />

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
              {/* Mock Chart Area */}
              <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-around px-4">
                  {[40, 60, 45, 75, 65, 80, 90, 85, 70, 95, 100, 88].map((height, index) => (
                    <div 
                      key={index}
                      className="bg-primary w-4 rounded-t transition-all duration-1000 ease-out"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Chart Legend */}
              <div className="flex items-center justify-center space-x-6 mt-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-primary rounded-sm mr-2"></div>
                  <span className="text-sm text-muted-foreground">Revenue</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-secondary rounded-sm mr-2"></div>
                  <span className="text-sm text-muted-foreground">Units Sold</span>
                </div>
              </div>
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
                  auditLogs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-check text-accent text-sm"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{log.action.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), 'h:mm a')}
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Plan */}
          <div className="bg-muted/30 rounded-lg border border-border p-6 relative">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Free</h3>
              <div className="text-3xl font-bold text-foreground">$0</div>
              <p className="text-sm text-muted-foreground">Perfect for getting started</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">100 monthly listings</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Unlimited crossposting to ALL platforms</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Basic AI features</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Mobile app access</span>
              </li>
            </ul>
            
            <Button variant="outline" className="w-full" disabled={user?.plan === 'free'}>
              {user?.plan === 'free' ? 'Current Plan' : 'Get Started Free'}
            </Button>
          </div>
          
          {/* Pro Plan */}
          <div className="bg-primary/5 rounded-lg border-2 border-primary p-6 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-full">Most Popular</span>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Pro</h3>
              <div className="text-3xl font-bold text-foreground">$19.99</div>
              <p className="text-sm text-muted-foreground">For serious resellers</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Unlimited listings</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Advanced AI product recognition</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Voice-to-listing technology</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Bulk management tools</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Analytics dashboard</span>
              </li>
            </ul>
            
            <Link href="/subscribe">
              <Button className="w-full" disabled={user?.plan === 'pro'}>
                {user?.plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
              </Button>
            </Link>
          </div>
          
          {/* Enterprise Plan */}
          <div className="bg-muted/30 rounded-lg border border-border p-6 relative">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">Enterprise</h3>
              <div className="text-3xl font-bold text-foreground">$39.99</div>
              <p className="text-sm text-muted-foreground">For large-scale operations</p>
            </div>
            
            <ul className="space-y-3 mb-6">
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Everything in Pro</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Advanced AI algorithms</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Priority support</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">API access</span>
              </li>
              <li className="flex items-center">
                <i className="fas fa-check text-accent mr-3"></i>
                <span className="text-sm text-foreground">Custom integrations</span>
              </li>
            </ul>
            
            <Button variant="secondary" className="w-full" disabled={user?.plan === 'enterprise'}>
              {user?.plan === 'enterprise' ? 'Current Plan' : 'Contact Sales'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
