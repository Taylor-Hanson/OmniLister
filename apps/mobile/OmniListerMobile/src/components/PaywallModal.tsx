import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { iapService, IAPProduct } from '../services/iap';
import { entitlementsService, Entitlement } from '@omnilister/core';
import { flag } from '@omnilister/flags';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
  entitlement: Entitlement;
  onPurchaseSuccess?: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  feature,
  entitlement,
  onPurchaseSuccess,
}) => {
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadProducts();
    }
  }, [visible]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const availableProducts = await iapService.getAvailableProducts();
      setProducts(availableProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (productId: string) => {
    try {
      setPurchasing(productId);
      const success = await iapService.purchase(productId);
      
      if (success) {
        Alert.alert(
          'Success!',
          'Your purchase was successful. You now have access to this feature.',
          [
            {
              text: 'OK',
              onPress: () => {
                onPurchaseSuccess?.();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Purchase Failed', 'Your purchase could not be completed. Please try again.');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'An error occurred during purchase. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      await iapService.restore();
      Alert.alert('Success', 'Previous purchases have been restored.');
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getProductForEntitlement = (entitlement: Entitlement): IAPProduct | null => {
    const mapping: Record<Entitlement, string> = {
      ADV_AUTOMATION: 'com.juliehanson.omnilister.adv_automation',
      BULK_ANALYTICS: 'com.juliehanson.omnilister.bulk_analytics',
      PREMIUM_SUPPORT: 'com.juliehanson.omnilister.premium_support',
      UNLIMITED_LISTINGS: 'com.juliehanson.omnilister.unlimited_listings',
    };

    const productId = mapping[entitlement];
    return products.find(p => p.productId === productId) || null;
  };

  const product = getProductForEntitlement(entitlement);

  if (!flag('paywall.advancedAutomation') && entitlement === 'ADV_AUTOMATION') {
    return null;
  }

  if (!flag('paywall.bulkAnalytics') && entitlement === 'BULK_ANALYTICS') {
    return null;
  }

  if (!flag('paywall.premiumSupport') && entitlement === 'PREMIUM_SUPPORT') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Unlock {feature}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Get access to {feature} and unlock the full potential of OmniLister.
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : product ? (
            <View style={styles.productContainer}>
              <View style={styles.productInfo}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.productDescription}>{product.description}</Text>
                <Text style={styles.productPrice}>{product.localizedPrice}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  purchasing === product.productId && styles.purchaseButtonDisabled,
                ]}
                onPress={() => handlePurchase(product.productId)}
                disabled={purchasing === product.productId}
              >
                {purchasing === product.productId ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.purchaseButtonText}>Purchase</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Product not available. Please try again later.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={loading}
          >
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              • Subscriptions auto-renew unless cancelled
            </Text>
            <Text style={styles.footerText}>
              • Manage subscriptions in your account settings
            </Text>
            <Text style={styles.footerText}>
              • Terms of Service and Privacy Policy apply
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  productContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  productInfo: {
    marginBottom: 20,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    lineHeight: 22,
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
  },
  restoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
});
