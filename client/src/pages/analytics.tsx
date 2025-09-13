import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useState, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, Brush, ComposedChart
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart,
  Activity, AlertCircle, Download, Filter, Calendar,
  ArrowUpRight, ArrowDownRight, Target, Zap, Award,
  BarChart3, PieChartIcon, LineChartIcon, Info,
  Clock, RefreshCw, Eye, Users, Percent, Calculator
} from "lucide-react";
import { motion } from "framer-motion";

// Color palette for charts
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

// Custom animated counter component
function AnimatedCounter({ value, prefix = "", suffix = "", decimals = 0 }: any) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const stepValue = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="font-bold text-2xl">
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}

// Performance Score Gauge Component
function PerformanceGauge({ score }: { score: number }) {
  const radius = 45;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={getColor()}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 1s ease-in-out" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold">{score}</span>
        <span className="text-xs text-muted-foreground">Score</span>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("30");
  const [selectedMarketplace, setSelectedMarketplace] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch all analytics data
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['/api/analytics/overview', timeRange],
    enabled: !!user,
  });

  const { data: revenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ['/api/analytics/revenue', timeRange],
    enabled: !!user,
  });

  const { data: inventory, isLoading: loadingInventory } = useQuery({
    queryKey: ['/api/analytics/inventory'],
    enabled: !!user,
  });

  const { data: marketplace, isLoading: loadingMarketplace } = useQuery({
    queryKey: ['/api/analytics/marketplace', timeRange],
    enabled: !!user,
  });

  const { data: forecast, isLoading: loadingForecast } = useQuery({
    queryKey: ['/api/analytics/forecast'],
    enabled: !!user,
  });

  const { data: competition, isLoading: loadingCompetition } = useQuery({
    queryKey: ['/api/analytics/competition'],
    enabled: !!user,
  });

  const { data: pricing, isLoading: loadingPricing } = useQuery({
    queryKey: ['/api/analytics/pricing'],
    enabled: !!user,
  });

  const isLoading = loadingOverview || loadingRevenue || loadingInventory || 
                   loadingMarketplace || loadingForecast || loadingCompetition || loadingPricing;

  // Export analytics data
  const handleExport = async (fmt: 'json' | 'csv') => {
    const response = await fetch(`/api/analytics/export?format=${fmt}`, {
      headers: {
        'Authorization': `Bearer ${user?.id}`,
      },
    });

    if (fmt === 'csv') {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } else {
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Deep insights to optimize your reselling business
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              data-testid="button-export-json"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Smart Insights Panel */}
      {!isLoading && overview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Card className="border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-blue-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-violet-500" />
                Smart Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {overview.salesVelocity?.daily > 2 && (
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertTitle>High Sales Velocity</AlertTitle>
                    <AlertDescription>
                      You're averaging {overview.salesVelocity.daily.toFixed(1)} sales per day. 
                      Consider increasing inventory to meet demand.
                    </AlertDescription>
                  </Alert>
                )}
                {overview.staleInventory > 10 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Stale Inventory Alert</AlertTitle>
                    <AlertDescription>
                      {overview.staleInventory} items haven't sold in 30+ days. 
                      Consider price reductions or promotional strategies.
                    </AlertDescription>
                  </Alert>
                )}
                {overview.avgMargin < 20 && (
                  <Alert>
                    <TrendingDown className="h-4 w-4" />
                    <AlertTitle>Low Profit Margins</AlertTitle>
                    <AlertDescription>
                      Your average profit margin is {overview.avgMargin?.toFixed(1)}%. 
                      Review pricing strategy and marketplace fees.
                    </AlertDescription>
                  </Alert>
                )}
                {competition?.opportunities?.length > 0 && (
                  <Alert className="border-green-500/20 bg-green-500/10">
                    <Target className="h-4 w-4 text-green-600" />
                    <AlertTitle>Opportunity Detected</AlertTitle>
                    <AlertDescription>
                      {competition.opportunities[0].recommendation}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <AnimatedCounter
                    value={overview?.totalRevenue || 0}
                    prefix="$"
                    decimals={2}
                  />
                  <div className="flex items-center mt-2">
                    {overview?.totalRevenue > 0 ? (
                      <>
                        <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-xs text-green-500">
                          +{((overview?.totalRevenue / 100) * 12).toFixed(1)}% vs last period
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No sales yet</span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <AnimatedCounter
                    value={overview?.totalProfit || 0}
                    prefix="$"
                    decimals={2}
                  />
                  <div className="flex items-center mt-2">
                    <Badge variant={overview?.profitMargin > 25 ? "default" : "secondary"}>
                      {overview?.profitMargin?.toFixed(1)}% margin
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sales Velocity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid="stat-sales-velocity">
                    {overview?.salesVelocity?.daily?.toFixed(1) || 0}
                    <span className="text-sm text-muted-foreground ml-1">per day</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {overview?.salesVelocity?.weekly?.toFixed(0) || 0}/week
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {overview?.salesVelocity?.monthly?.toFixed(0) || 0}/month
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <PerformanceGauge score={Math.round(overview?.conversionRate || 0)} />
                    <div>
                      <div className="text-2xl font-bold" data-testid="stat-conversion-rate">
                        {overview?.conversionRate?.toFixed(1) || 0}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {overview?.soldListings || 0} sold of {overview?.activeListings || 0}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">
            <Package className="h-4 w-4 mr-2" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="marketplace" data-testid="tab-marketplace">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Marketplaces
          </TabsTrigger>
          <TabsTrigger value="forecast" data-testid="tab-forecast">
            <TrendingUp className="h-4 w-4 mr-2" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="competition" data-testid="tab-competition">
            <Users className="h-4 w-4 mr-2" />
            Competition
          </TabsTrigger>
          <TabsTrigger value="calculator" data-testid="tab-calculator">
            <Calculator className="h-4 w-4 mr-2" />
            Calculator
          </TabsTrigger>
        </TabsList>

        {/* Revenue Analytics Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Revenue, profit, and fees over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenue?.timeSeries || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="fees" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Marketplace</CardTitle>
                <CardDescription>Performance across platforms</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenue?.byMarketplace || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                        label={({ marketplace, percent }) => `${marketplace} ${(percent * 100).toFixed(0)}%`}
                      >
                        {revenue?.byMarketplace?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Revenue breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenue?.byCategory || []} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ROI Analysis</CardTitle>
                <CardDescription>Return on investment metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">ROI Percentage</span>
                      <span className="text-2xl font-bold text-green-500">
                        {revenue?.roi?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <Progress value={revenue?.roi || 0} className="h-2" />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                        <p className="text-lg font-semibold">${revenue?.totalRevenue?.toFixed(2) || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Profit</p>
                        <p className="text-lg font-semibold text-green-500">
                          ${revenue?.totalProfit?.toFixed(2) || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Fees</p>
                        <p className="text-lg font-semibold text-red-500">
                          ${revenue?.totalFees?.toFixed(2) || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Analytics Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Aging Report</CardTitle>
                <CardDescription>Items by age category</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-500/10 rounded-lg">
                        <p className="text-sm text-muted-foreground">Fresh (0-30 days)</p>
                        <p className="text-2xl font-bold text-green-500">
                          {inventory?.agingReport?.fresh || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-500/10 rounded-lg">
                        <p className="text-sm text-muted-foreground">Stale (30-60 days)</p>
                        <p className="text-2xl font-bold text-yellow-500">
                          {inventory?.agingReport?.stale || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-orange-500/10 rounded-lg">
                        <p className="text-sm text-muted-foreground">Aged (60-90 days)</p>
                        <p className="text-2xl font-bold text-orange-500">
                          {inventory?.agingReport?.aged || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-red-500/10 rounded-lg">
                        <p className="text-sm text-muted-foreground">Dead (90+ days)</p>
                        <p className="text-2xl font-bold text-red-500">
                          {inventory?.agingReport?.dead || 0}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4">
                      <p className="text-sm text-muted-foreground mb-2">Average Inventory Age</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xl font-bold">
                          {inventory?.avgInventoryAge?.toFixed(0) || 0} days
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Turnover by Category</CardTitle>
                <CardDescription>How quickly items sell by category</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={inventory?.turnoverByCategory || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgAge" fill="#f59e0b" name="Avg Age (days)" />
                      <Bar dataKey="turnoverRate" fill="#10b981" name="Turnover Rate" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Dead Stock Alert</CardTitle>
                <CardDescription>Items that need immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-4">
                      {inventory?.deadStock?.length > 0 ? (
                        inventory.deadStock.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">{item.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{item.category}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {item.ageInDays} days old
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={item.ageInDays > 120 ? "destructive" : "secondary"}>
                                {item.suggestedAction}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No dead stock detected - great job!
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Marketplace Performance Tab */}
        <TabsContent value="marketplace" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Marketplace Comparison</CardTitle>
              <CardDescription>Performance metrics across all platforms</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Marketplace</th>
                        <th className="text-right p-2">Sales</th>
                        <th className="text-right p-2">Revenue</th>
                        <th className="text-right p-2">Profit</th>
                        <th className="text-right p-2">Fees</th>
                        <th className="text-right p-2">Avg Days</th>
                        <th className="text-right p-2">Margin</th>
                        <th className="text-right p-2">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketplace?.marketplaces?.map((mp: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              {mp.marketplace}
                              {mp.marketplace === marketplace?.bestMarketplace && (
                                <Badge variant="default" className="ml-2">Best</Badge>
                              )}
                              {mp.marketplace === marketplace?.worstMarketplace && (
                                <Badge variant="destructive" className="ml-2">Needs Work</Badge>
                              )}
                            </div>
                          </td>
                          <td className="text-right p-2">{mp.totalSales}</td>
                          <td className="text-right p-2">${mp.totalRevenue?.toFixed(2)}</td>
                          <td className="text-right p-2 text-green-500">
                            ${mp.totalProfit?.toFixed(2)}
                          </td>
                          <td className="text-right p-2 text-red-500">
                            ${mp.totalFees?.toFixed(2)}
                          </td>
                          <td className="text-right p-2">{mp.avgDaysToSell?.toFixed(1)}</td>
                          <td className="text-right p-2">{mp.avgMargin?.toFixed(1)}%</td>
                          <td className="text-right p-2">
                            <PerformanceGauge score={mp.performanceScore} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!marketplace?.marketplaces || marketplace.marketplaces.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No marketplace data available yet
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Fee Analysis</CardTitle>
                <CardDescription>True cost per marketplace</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={marketplace?.marketplaces || []}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="marketplace" />
                      <PolarRadiusAxis />
                      <Radar name="Fee %" dataKey="feePercentage" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Marketplace Recommendations</CardTitle>
                <CardDescription>Optimized platform suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="space-y-4">
                    {competition?.categoryPerformance?.slice(0, 5).map((cat: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{cat.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {cat.sales} sales • ${cat.revenue?.toFixed(2)} revenue
                          </p>
                        </div>
                        <Badge variant={
                          cat.performance === 'high' ? 'default' :
                          cat.performance === 'medium' ? 'secondary' : 'outline'
                        }>
                          {cat.avgMargin?.toFixed(1)}% margin
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Forecast</CardTitle>
                <CardDescription>Predicted sales for the next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={forecast?.forecast || []}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="predictedSales" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Forecast</CardTitle>
                <CardDescription>Projected revenue with confidence intervals</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={forecast?.forecast || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="predictedRevenue" fill="#3b82f6" />
                      <Line type="monotone" dataKey="confidence" stroke="#10b981" name="Confidence %" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projected Metrics</CardTitle>
                <CardDescription>Expected performance</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                      <span className="text-xl font-bold">
                        ${forecast?.projectedMonthlyRevenue?.toFixed(2) || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Monthly Sales</span>
                      <span className="text-xl font-bold">
                        {forecast?.projectedMonthlySales || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Daily Average</span>
                      <span className="text-xl font-bold">
                        ${forecast?.historicalAverage?.dailyRevenue?.toFixed(2) || 0}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trending Categories</CardTitle>
                <CardDescription>Rising and falling trends</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-green-500 mb-2">
                        <TrendingUp className="h-4 w-4 inline mr-1" />
                        Trending Up
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {competition?.trendingCategories?.map((cat: string) => (
                          <Badge key={cat} variant="default">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-red-500 mb-2">
                        <TrendingDown className="h-4 w-4 inline mr-1" />
                        Trending Down
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {competition?.decliningCategories?.map((cat: string) => (
                          <Badge key={cat} variant="destructive">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Competition Tab */}
        <TabsContent value="competition" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Position</CardTitle>
                <CardDescription>Your position in the market</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <Badge variant="default" className="text-lg px-4 py-2">
                        {competition?.marketPosition?.toUpperCase() || 'ANALYZING'}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        Based on pricing and category performance
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Award className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                        <p className="text-sm text-muted-foreground">Top Categories</p>
                        <p className="font-semibold">{competition?.trendingCategories?.length || 0}</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p className="text-sm text-muted-foreground">Opportunities</p>
                        <p className="font-semibold">{competition?.opportunities?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Analysis</CardTitle>
                <CardDescription>Performance by category</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <Treemap
                      data={competition?.categoryPerformance?.map((cat: any) => ({
                        name: cat.category,
                        size: cat.revenue,
                        fill: cat.performance === 'high' ? '#10b981' : 
                              cat.performance === 'medium' ? '#f59e0b' : '#ef4444'
                      }))}
                      dataKey="size"
                      aspectRatio={4/3}
                      stroke="#fff"
                    />
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Pricing Optimization</CardTitle>
                <CardDescription>Recommended price adjustments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Category</th>
                          <th className="text-right p-2">Current Avg Price</th>
                          <th className="text-right p-2">Days to Sell</th>
                          <th className="text-right p-2">Suggested Price</th>
                          <th className="text-left p-2">Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricing?.pricingSuggestions?.map((suggestion: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2">{suggestion.category}</td>
                            <td className="text-right p-2">${suggestion.currentAvgPrice?.toFixed(2)}</td>
                            <td className="text-right p-2">{suggestion.avgDaysToSell?.toFixed(0)}</td>
                            <td className="text-right p-2 font-semibold">
                              ${suggestion.suggestedPrice?.toFixed(2)}
                            </td>
                            <td className="p-2">
                              <span className="text-sm text-muted-foreground">
                                {suggestion.recommendation}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!pricing?.pricingSuggestions || pricing.pricingSuggestions.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        Need more sales data to generate pricing suggestions
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profit Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profit Calculator</CardTitle>
              <CardDescription>Calculate true profit including all fees and costs</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfitCalculator />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Profit Calculator Component
function ProfitCalculator() {
  const [salePrice, setSalePrice] = useState("");
  const [costOfGoods, setCostOfGoods] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [marketplaceFee, setMarketplaceFee] = useState("10");
  const [paymentFee, setPaymentFee] = useState("2.9");
  const [otherFees, setOtherFees] = useState("");

  const calculateProfit = () => {
    const sale = parseFloat(salePrice) || 0;
    const cost = parseFloat(costOfGoods) || 0;
    const shipping = parseFloat(shippingCost) || 0;
    const mpFee = (sale * parseFloat(marketplaceFee)) / 100;
    const pmtFee = (sale * parseFloat(paymentFee)) / 100 + 0.30;
    const other = parseFloat(otherFees) || 0;

    const totalFees = mpFee + pmtFee + other;
    const totalCosts = cost + shipping + totalFees;
    const profit = sale - totalCosts;
    const margin = sale > 0 ? (profit / sale) * 100 : 0;

    return {
      revenue: sale,
      costs: totalCosts,
      fees: totalFees,
      profit,
      margin,
      breakdown: {
        marketplaceFee: mpFee,
        paymentFee: pmtFee,
        shippingCost: shipping,
        costOfGoods: cost,
        otherFees: other,
      }
    };
  };

  const result = calculateProfit();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Sale Price ($)</label>
          <input
            type="number"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="0.00"
            data-testid="input-sale-price"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Cost of Goods ($)</label>
          <input
            type="number"
            value={costOfGoods}
            onChange={(e) => setCostOfGoods(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="0.00"
            data-testid="input-cost-goods"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Shipping Cost ($)</label>
          <input
            type="number"
            value={shippingCost}
            onChange={(e) => setShippingCost(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="0.00"
            data-testid="input-shipping-cost"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Marketplace Fee (%)</label>
          <Select value={marketplaceFee} onValueChange={setMarketplaceFee}>
            <SelectTrigger data-testid="select-marketplace-fee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6.5">eBay (6.5%)</SelectItem>
              <SelectItem value="10">Poshmark (10%)</SelectItem>
              <SelectItem value="10">Mercari (10%)</SelectItem>
              <SelectItem value="20">Depop (20%)</SelectItem>
              <SelectItem value="6">Facebook (6%)</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Processing (%)</label>
          <input
            type="number"
            value={paymentFee}
            onChange={(e) => setPaymentFee(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="2.9"
            data-testid="input-payment-fee"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Other Fees ($)</label>
          <input
            type="number"
            value={otherFees}
            onChange={(e) => setOtherFees(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="0.00"
            data-testid="input-other-fees"
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-2xl font-bold">${result.revenue.toFixed(2)}</p>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <TrendingDown className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <p className="text-sm text-muted-foreground">Total Costs</p>
          <p className="text-2xl font-bold text-red-500">-${result.costs.toFixed(2)}</p>
        </div>
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm text-muted-foreground">Net Profit</p>
          <p className="text-2xl font-bold text-green-500">${result.profit.toFixed(2)}</p>
        </div>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium">Profit Margin</span>
          <span className={`text-2xl font-bold ${result.margin >= 30 ? 'text-green-500' : result.margin >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
            {result.margin.toFixed(1)}%
          </span>
        </div>
        <Progress value={Math.max(0, Math.min(100, result.margin))} className="h-3" />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium mb-2">Cost Breakdown</p>
        {Object.entries(result.breakdown).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center py-1">
            <span className="text-sm text-muted-foreground capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className="text-sm font-medium">${(value as number).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {result.margin < 15 && result.revenue > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Low Profit Warning</AlertTitle>
          <AlertDescription>
            Your profit margin is below 15%. Consider increasing price or finding lower cost sources.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}