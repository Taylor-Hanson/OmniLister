import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";

export default function StatsCards() {
  const { user } = useAuth();

  const { data: userStats, isLoading } = useQuery({
    queryKey: ['/api/user/stats'],
    enabled: !!user,
  });

  const stats = [
    {
      title: "Active Listings",
      value: userStats?.activeListings || 0,
      change: "+12%",
      changeLabel: "vs last month",
      icon: "fas fa-list",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      testId: "stat-active-listings"
    },
    {
      title: "Monthly Revenue",
      value: `$${userStats?.monthlyRevenue?.toFixed(2) || '0.00'}`,
      change: "+24%",
      changeLabel: "vs last month",
      icon: "fas fa-dollar-sign",
      iconColor: "text-accent",
      iconBg: "bg-accent/10",
      testId: "stat-monthly-revenue"
    },
    {
      title: "Total Sales",
      value: userStats?.totalSales || 0,
      change: "+18%",
      changeLabel: "vs last month",
      icon: "fas fa-shopping-cart",
      iconColor: "text-secondary",
      iconBg: "bg-secondary/10",
      testId: "stat-total-sales"
    },
    {
      title: "Conversion Rate",
      value: `${userStats?.conversionRate?.toFixed(1) || '0.0'}%`,
      change: "+5.2%",
      changeLabel: "vs last month",
      icon: "fas fa-percentage",
      iconColor: "text-chart-4",
      iconBg: "bg-chart-4/20",
      testId: "stat-conversion-rate"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-muted rounded-lg"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-3 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`w-10 h-10 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                <i className={`${stat.icon} ${stat.iconColor}`}></i>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground" data-testid={stat.testId}>
                  {stat.value}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm">
                <span className="text-accent font-medium">{stat.change}</span>
                <span className="text-muted-foreground ml-2">{stat.changeLabel}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
