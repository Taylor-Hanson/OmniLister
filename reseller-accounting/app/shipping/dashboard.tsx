import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useAuthStore } from '../../src/state/useAuthStore';
import { ShipmentRecord, ShippingDashboardStats } from '../../src/types/shipping';

const BASE = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export default function ShippingDashboard() {
  const { orgId } = useAuthStore();
  const [stats, setStats] = useState<ShippingDashboardStats | null>(null);
  const [pendingShipments, setPendingShipments] = useState<ShipmentRecord[]>([]);
  const [recentShipments, setRecentShipments] = useState<ShipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Load stats
      const statsResponse = await fetch(`${BASE}/functions/v1/shipping-dashboard-stats?orgId=${orgId}`);
      const statsData = await statsResponse.json();
      setStats(statsData.stats);

      // Load pending shipments
      const pendingResponse = await fetch(`${BASE}/functions/v1/shipping-pending?orgId=${orgId}`);
      const pendingData = await pendingResponse.json();
      setPendingShipments(pendingData.shipments || []);

      // Load recent shipments
      const recentResponse = await fetch(`${BASE}/functions/v1/shipping-recent?orgId=${orgId}`);
      const recentData = await recentResponse.json();
      setRecentShipments(recentData.shipments || []);

    } catch (e: any) {
      Alert.alert('Failed to load dashboard', String(e.message));
    } finally {
      setLoading(false);
    }
  }

  async function syncMarketplaceOrders() {
    try {
      const response = await fetch(`${BASE}/functions/v1/shipping-sync-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Marketplace orders synced successfully');
        await loadDashboardData();
      } else {
        const error = await response.json();
        Alert.alert('Sync failed', error.error || 'Unknown error');
      }
    } catch (e: any) {
      Alert.alert('Sync failed', String(e.message));
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading shipping dashboard...</Text>
      </View>
    );
  }

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#007AFF', padding: 20, paddingTop: 60 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '700' }}>Shipping Dashboard</Text>
        <Text style={{ color: 'white', opacity: 0.9, marginTop: 4 }}>
          Manage your shipments and track packages
        </Text>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#007AFF' }}>
                {stats.pendingShipments}
              </Text>
              <Text style={{ color: '#666', marginTop: 4 }}>Pending</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#34C759' }}>
                {stats.shippedToday}
              </Text>
              <Text style={{ color: '#666', marginTop: 4 }}>Shipped Today</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#FF9500' }}>
                {formatCurrency(stats.totalShippingCost)}
              </Text>
              <Text style={{ color: '#666', marginTop: 4 }}>Total Cost</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#5856D6' }}>
                {stats.onTimeDeliveryRate}%
              </Text>
              <Text style={{ color: '#666', marginTop: 4 }}>On-Time Rate</Text>
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={{ padding: 16, gap: 12 }}>
        <Pressable
          onPress={syncMarketplaceOrders}
          style={{ backgroundColor: '#007AFF', padding: 16, borderRadius: 12 }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
            Sync Marketplace Orders
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {/* Navigate to create shipment */}}
          style={{ backgroundColor: '#34C759', padding: 16, borderRadius: 12 }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
            Create New Shipment
          </Text>
        </Pressable>
      </View>

      {/* Pending Shipments */}
      {pendingShipments.length > 0 && (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            Pending Shipments ({pendingShipments.length})
          </Text>
          <FlatList
            data={pendingShipments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600' }}>
                      {item.toAddress.name}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>
                      {item.toAddress.city}, {item.toAddress.state} {item.toAddress.zip}
                    </Text>
                    {item.marketplaceOrderId && (
                      <Text style={{ color: '#007AFF', fontSize: 12 }}>
                        Order: {item.marketplaceOrderId}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#FF9500', fontWeight: '600' }}>
                      {item.status.toUpperCase()}
                    </Text>
                    {item.costCents && (
                      <Text style={{ color: '#666', fontSize: 12 }}>
                        {formatCurrency(item.costCents)}
                      </Text>
                    )}
                  </View>
                </View>
                <Pressable
                  onPress={() => {/* Navigate to shipment details */}}
                  style={{ backgroundColor: '#007AFF', padding: 8, borderRadius: 8, marginTop: 8 }}
                >
                  <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
                    View Details
                  </Text>
                </Pressable>
              </View>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Recent Shipments */}
      {recentShipments.length > 0 && (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            Recent Shipments
          </Text>
          <FlatList
            data={recentShipments.slice(0, 5)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600' }}>
                      {item.toAddress.name}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>
                      {item.carrier} {item.serviceLevel}
                    </Text>
                    {item.trackingNumber && (
                      <Text style={{ color: '#007AFF', fontSize: 12 }}>
                        {item.trackingNumber}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ 
                      color: item.status === 'delivered' ? '#34C759' : 
                             item.status === 'in_transit' ? '#007AFF' : '#FF9500',
                      fontWeight: '600' 
                    }}>
                      {item.status.toUpperCase()}
                    </Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Empty State */}
      {pendingShipments.length === 0 && recentShipments.length === 0 && (
        <View style={{ padding: 32, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
            No shipments yet
          </Text>
          <Text style={{ color: '#666', textAlign: 'center', marginBottom: 24 }}>
            Sync your marketplace orders or create a new shipment to get started.
          </Text>
          <Pressable
            onPress={syncMarketplaceOrders}
            style={{ backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Sync Orders
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
