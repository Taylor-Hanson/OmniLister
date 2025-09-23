import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, TrendingUp, TrendingDown, DollarSign, Package, Clock, BarChart3 } from 'lucide-react';
import { flag } from '@omnilister/flags';
import { entitlementsService, Entitlement } from '@omnilister/core';

interface AnalyticsData {
  overview: {
    totalListings: number;
    activeListings: number;
    soldListings: number;
    totalRevenue: number;
    averageSellingPrice: number;
    sellThroughRate: number;
    averageDaysToSell: number;
  };
  sales: {
    date: string;
    revenue: number;
    units: number;
  }[];
  performance: {
    marketplace: string;
    listings: number;
    revenue: number;
    sellThroughRate: number;
    averagePrice: number;
  }[];
  inventory: {
    category: string;
    total: number;
    active: number;
    sold: number;
    stale: number;
  }[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasEntitlement, setHasEntitlement] = useState(false);
  const [dateRange, setDateRange] = useState('30d');
  const [marketplace, setMarketplace] = useState('all');

  useEffect(() => {
    checkEntitlement();
    loadAnalytics();
  }, [dateRange, marketplace]);

  const checkEntitlement = async () => {
    try {
      const userId = 'current-user-id'; // This would come from auth context
      const hasAccess = await entitlementsService.hasEntitlement(userId, 'BULK_ANALYTICS');
      setHasEntitlement(hasAccess);
    } catch (error) {
      console.error('Error checking entitlement:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // Mock data - in real implementation, this would fetch from API
      const mockData: AnalyticsData = {
        overview: {
          totalListings: 1250,
          activeListings: 890,
          soldListings: 360,
          totalRevenue: 45230,
          averageSellingPrice: 125.64,
          sellThroughRate: 28.8,
          averageDaysToSell: 23,
        },
        sales: [
          { date: '2024-01-01', revenue: 1200, units: 8 },
          { date: '2024-01-02', revenue: 950, units: 6 },
          { date: '2024-01-03', revenue: 1800, units: 12 },
          { date: '2024-01-04', revenue: 1100, units: 7 },
          { date: '2024-01-05', revenue: 1600, units: 10 },
        ],
        performance: [
          { marketplace: 'eBay', listings: 450, revenue: 18500, sellThroughRate: 32.1, averagePrice: 128.50 },
          { marketplace: 'Poshmark', listings: 320, revenue: 15200, sellThroughRate: 28.5, averagePrice: 118.75 },
          { marketplace: 'Mercari', listings: 280, revenue: 11530, sellThroughRate: 25.2, averagePrice: 105.20 },
        ],
        inventory: [
          { category: 'Clothing', total: 650, active: 480, sold: 170, stale: 45 },
          { category: 'Electronics', total: 320, active: 210, sold: 110, stale: 25 },
          { category: 'Home & Garden', total: 280, active: 200, sold: 80, stale: 15 },
        ],
      };
      setData(mockData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // In real implementation, this would generate and download CSV
    console.log('Exporting analytics data...');
  };

  if (!flag('web.analytics')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
          <p className="text-gray-600">This feature is currently disabled.</p>
        </div>
      </div>
    );
  }

  if (!hasEntitlement) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Analytics Dashboard</h1>
          <p className="text-gray-600 mb-6">
            This feature requires a Bulk Analytics subscription.
          </p>
          <Button onClick={() => router.push('/pricing')}>
            Upgrade Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Track your performance and optimize your selling strategy
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={marketplace} onValueChange={setMarketplace}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Marketplaces</SelectItem>
              <SelectItem value="ebay">eBay</SelectItem>
              <SelectItem value="poshmark">Poshmark</SelectItem>
              <SelectItem value="mercari">Mercari</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      ) : data ? (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${data.overview.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +12.5% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overview.activeListings.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +8.2% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sell-Through Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overview.sellThroughRate}%</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +2.1% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Days to Sell</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overview.averageDaysToSell}</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingDown className="inline h-3 w-3 mr-1" />
                  -3.2 days from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Marketplace */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Performance by Marketplace</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.performance.map((marketplace) => (
                  <div key={marketplace.marketplace} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{marketplace.marketplace}</h3>
                      <p className="text-sm text-gray-600">{marketplace.listings} listings</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${marketplace.revenue.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">
                        {marketplace.sellThroughRate}% sell-through
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${marketplace.averagePrice}</p>
                      <p className="text-sm text-gray-600">avg. price</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inventory by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.inventory.map((category) => (
                  <div key={category.category} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{category.category}</h3>
                      <p className="text-sm text-gray-600">{category.total} total items</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="font-medium text-green-600">{category.active}</p>
                        <p className="text-xs text-gray-600">Active</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-blue-600">{category.sold}</p>
                        <p className="text-xs text-gray-600">Sold</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-red-600">{category.stale}</p>
                        <p className="text-xs text-gray-600">Stale</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No analytics data available.</p>
        </div>
      )}
    </div>
  );
}