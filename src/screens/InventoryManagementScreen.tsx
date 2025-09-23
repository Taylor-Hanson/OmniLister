// Inventory Management Screen - Modern UI with SKU tracking

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const itemWidth = (width - 60) / 2;

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  image: string;
  price: number;
  status: 'active' | 'low_stock' | 'out_of_stock';
}

export default function InventoryManagementScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'Blue Denim Shirt',
      sku: 'ABC123',
      stock: 25,
      image: 'https://via.placeholder.com/150x150/4A90E2/FFFFFF?text=Shirt',
      price: 29.99,
      status: 'active',
    },
    {
      id: '2',
      name: 'Silver Watch',
      sku: 'DEF456',
      stock: 50,
      image: 'https://via.placeholder.com/150x150/C0C0C0/FFFFFF?text=Watch',
      price: 199.99,
      status: 'active',
    },
    {
      id: '3',
      name: 'Brown Jacket',
      sku: 'GHI789',
      stock: 5,
      image: 'https://via.placeholder.com/150x150/8B4513/FFFFFF?text=Jacket',
      price: 89.99,
      status: 'low_stock',
    },
    {
      id: '4',
      name: 'Gold Watch',
      sku: 'JKL012',
      stock: 0,
      image: 'https://via.placeholder.com/150x150/FFD700/FFFFFF?text=Watch',
      price: 299.99,
      status: 'out_of_stock',
    },
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34C759';
      case 'low_stock': return '#FF9500';
      case 'out_of_stock': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'In Stock';
      case 'low_stock': return 'Low Stock';
      case 'out_of_stock': return 'Out of Stock';
      default: return 'Unknown';
    }
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity style={styles.itemCard}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.itemImage} />
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemSku}>SKU: {item.sku}</Text>
        <Text style={styles.itemStock}>Stock: {item.stock}</Text>
        <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="pencil" size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Inventory Management</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{inventoryItems.length}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#34C759' }]}>
              {inventoryItems.filter(item => item.status === 'active').length}
            </Text>
            <Text style={styles.statLabel}>In Stock</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF9500' }]}>
              {inventoryItems.filter(item => item.status === 'low_stock').length}
            </Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={inventoryItems}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  itemCard: {
    width: itemWidth,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemSku: {
    color: '#666',
    fontSize: 12,
    marginBottom: 2,
  },
  itemStock: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  itemPrice: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
