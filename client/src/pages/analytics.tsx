import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useState } from "react";

export default function Analytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("30");

  const { data: userStats } = useQuery({
    queryKey: ['/api/user/stats'],
    enabled: !!user,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['/api/listings'],
    enabled: !!user,
  });

  const { data: marketplaces = [] } = useQuery({
    queryKey: ['/api/marketplaces'],
    enabled: !!user,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/jobs'],
    enabled: !!user,
  });

  // Calculate analytics data
  const days = parseInt(timeRange);
  const startDate = startOfDay(subDays(new Date(), days));
  const endDate = endOfDay(new Date());

  const filteredListings = listings.filter((listing: any) => {
    const listingDate = new Date(listing.createdAt);
    return listingDate >= startDate && listingDate <= endDate;
  });

  const listingsByStatus = filteredListings.reduce((acc: any, listing: any) => {
    acc[listing.status] = (acc[listing.status] || 0) + 1;
    return acc;
  }, {});

  const listingsByCategory = filteredListings.reduce((acc: any, listing: any) => {
    const category = listing.category || 'Other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const listingsByMarketplace = jobs
    .filter((job: any) => job.type === 'post-listing' && job.status === 'completed')
    .reduce((acc: any, job: any) => {
      if (job.result?.results) {
        job.result.results.forEach((result: any) => {
          if (result.success) {
            acc[result.marketplace] = (acc[result.marketplace] || 0) + 1;
          }
        });
      }
      return acc;
    }, {});

  const averagePrice = filteredListings.length > 0
    ? filteredListings.reduce((sum: number, listing: any) => sum + parseFloat(listing.price), 0) / filteredListings.length
    : 0;

  const totalValue = filteredListings.reduce((sum: number, listing: any) => {
    return sum + (parseFloat(listing.price) * (listing.quantity || 1));
  }, 0);

  const successfulJobs = jobs.filter((job: any) => job.status === 'completed').length;
  const failedJobs = jobs.filter((job: any) => job.status === 'failed').length;
  const jobSuccessRate = jobs.length > 0 ? (successfulJobs / jobs.length) * 100 : 0;

  const getTopItems = (data: any, limit = 5) => {
    return Object.entries(data)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, limit);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Track your performance and optimize your reselling strategy
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48" data-testid="select-time-range">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="listings" data-testid="tab-listings">Listings</TabsTrigger>
          <TabsTrigger value="marketplaces" data-testid="tab-marketplaces">Marketplaces</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground" data-testid="stat-active-listings">
                  {userStats?.activeListings || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {listingsByStatus.active || 0} new this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground" data-testid="stat-total-sales">
                  {userStats?.totalSales || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {listingsByStatus.sold || 0} sold this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground" data-testid="stat-monthly-revenue">
                  ${userStats?.monthlyRevenue?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${totalValue.toFixed(2)} total value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground" data-testid="stat-conversion-rate">
                  {userStats?.conversionRate?.toFixed(1) || '0.0'}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {jobSuccessRate.toFixed(1)}% job success rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <i className="fas fa-chart-line text-4xl mb-2"></i>
                    <p>Revenue chart will be displayed here</p>
                    <p className="text-sm">Integrate with Chart.js or similar library</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <i className="fas fa-chart-pie text-4xl mb-2"></i>
                    <p>Category breakdown chart</p>
                    <p className="text-sm">Doughnut chart showing category distribution</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="listings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Listings by Status */}
            <Card>
              <CardHeader>
                <CardTitle>Listings by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(listingsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {status}
                        </Badge>
                      </div>
                      <span className="font-medium" data-testid={`count-status-${status}`}>
                        {count as number}
                      </span>
                    </div>
                  ))}
                  {Object.keys(listingsByStatus).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No listings in selected time range
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Listings by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Listings by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getTopItems(listingsByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize text-foreground">{category}</span>
                      <span className="font-medium" data-testid={`count-category-${category}`}>
                        {count as number}
                      </span>
                    </div>
                  ))}
                  {Object.keys(listingsByCategory).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No listings in selected time range
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Price Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Price Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Average Price</span>
                    <span className="font-medium text-lg" data-testid="text-average-price">
                      ${averagePrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Inventory Value</span>
                    <span className="font-medium text-lg" data-testid="text-total-value">
                      ${totalValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Items Listed</span>
                    <span className="font-medium text-lg" data-testid="text-items-listed">
                      {filteredListings.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Listing Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Listing Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredListings
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((listing: any) => (
                      <div key={listing.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {listing.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(listing.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">${parseFloat(listing.price).toFixed(2)}</span>
                          <Badge variant="outline" className="text-xs">
                            {listing.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  {filteredListings.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No recent listings
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="marketplaces" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Posts by Marketplace */}
            <Card>
              <CardHeader>
                <CardTitle>Posts by Marketplace</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getTopItems(listingsByMarketplace).map(([marketplace, count]) => (
                    <div key={marketplace} className="flex items-center justify-between">
                      <span className="capitalize text-foreground">{marketplace}</span>
                      <span className="font-medium" data-testid={`count-marketplace-${marketplace}`}>
                        {count as number}
                      </span>
                    </div>
                  ))}
                  {Object.keys(listingsByMarketplace).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No marketplace posts yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Marketplace Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle>Marketplace Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketplaces.map((marketplace: any) => (
                    <div key={marketplace.marketplace} className="flex items-center justify-between">
                      <span className="capitalize text-foreground">{marketplace.marketplace}</span>
                      <Badge
                        className={marketplace.isConnected
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }
                      >
                        {marketplace.isConnected ? 'Connected' : 'Disconnected'}
                      </Badge>
                    </div>
                  ))}
                  {marketplaces.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No marketplaces configured
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Job Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Jobs</span>
                    <span className="font-medium text-lg" data-testid="text-total-jobs">
                      {jobs.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Successful Jobs</span>
                    <span className="font-medium text-lg text-green-600" data-testid="text-successful-jobs">
                      {successfulJobs}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Failed Jobs</span>
                    <span className="font-medium text-lg text-red-600" data-testid="text-failed-jobs">
                      {failedJobs}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium text-lg" data-testid="text-success-rate">
                      {jobSuccessRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Current Plan</span>
                    <Badge variant="outline" className="capitalize" data-testid="badge-current-plan">
                      {user?.plan || 'free'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Listings This Month</span>
                    <span className="font-medium" data-testid="text-monthly-listings">
                      {filteredListings.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Connected Marketplaces</span>
                    <span className="font-medium" data-testid="text-connected-marketplaces">
                      {marketplaces.filter((m: any) => m.isConnected).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
