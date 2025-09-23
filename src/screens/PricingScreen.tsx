// Pricing Screen - Competitive pricing strategy with money-back guarantee

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { pricingService, PricingPlan, PricingFeature } from '../services/pricingService';

export default function PricingScreen() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [features, setFeatures] = useState<PricingFeature[]>([]);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = () => {
    const pricingStrategy = pricingService.getPricingStrategy();
    setPlans(pricingStrategy.plans);
    setFeatures(pricingStrategy.features);
  };

  const selectPlan = (planId: string) => {
    setSelectedPlan(planId);
    
    const plan = pricingService.getPlan(planId);
    if (plan) {
      Alert.alert(
        'Select Plan',
        `You've selected the ${plan.name} plan. Continue to checkout?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => {
            // In real app, navigate to checkout
            console.log('Navigate to checkout for plan:', planId);
          }}
        ]
      );
    }
  };

  const getPlanPrice = (plan: PricingPlan): number => {
    if (isAnnual && plan.price > 0) {
      return plan.price * 12 * 0.8; // 20% annual discount
    }
    return plan.price;
  };

  const getPlanPriceText = (plan: PricingPlan): string => {
    if (plan.price === 0) return 'Free';
    if (plan.price === 0 && plan.id === 'enterprise') return 'Custom';
    
    const price = getPlanPrice(plan);
    if (isAnnual) {
      return `$${price.toFixed(0)}/year`;
    }
    return `$${price.toFixed(2)}/month`;
  };

  const getSavingsText = (plan: PricingPlan): string => {
    if (!isAnnual || plan.price === 0) return '';
    
    const monthlyPrice = plan.price;
    const annualPrice = monthlyPrice * 12;
    const discountedPrice = annualPrice * 0.8;
    const savings = annualPrice - discountedPrice;
    
    return `Save $${savings.toFixed(0)}/year`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Choose Your Plan</Text>
      <Text style={styles.headerSubtitle}>
        All features included • No add-on fees • 30-day money-back guarantee
      </Text>
      
      {/* Annual/Monthly Toggle */}
      <View style={styles.toggleContainer}>
        <Text style={[styles.toggleText, !isAnnual && styles.toggleTextActive]}>
          Monthly
        </Text>
        <Switch
          value={isAnnual}
          onValueChange={setIsAnnual}
          trackColor={{ false: '#767577', true: '#007AFF' }}
          thumbColor={isAnnual ? '#fff' : '#f4f3f4'}
        />
        <Text style={[styles.toggleText, isAnnual && styles.toggleTextActive]}>
          Annual
        </Text>
        {isAnnual && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsBadgeText}>Save 20%</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderPricingPlans = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pricing Plans</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.plansContainer}>
        {plans.map((plan) => (
          <View key={plan.id} style={styles.planCard}>
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            )}
            {plan.recommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
              </View>
            )}
            
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>{getPlanPriceText(plan)}</Text>
              {getSavingsText(plan) && (
                <Text style={styles.planSavings}>{getSavingsText(plan)}</Text>
              )}
            </View>
            
            <View style={styles.planFeatures}>
              {pricingService.getPlanFeatures(plan.id).slice(0, 6).map((feature, index) => (
                <View key={index} style={styles.planFeature}>
                  <Ionicons name="checkmark" size={16} color="#34C759" />
                  <Text style={styles.planFeatureText}>{feature.name}</Text>
                </View>
              ))}
              {pricingService.getPlanFeatures(plan.id).length > 6 && (
                <Text style={styles.moreFeaturesText}>
                  +{pricingService.getPlanFeatures(plan.id).length - 6} more features
                </Text>
              )}
            </View>
            
            <TouchableOpacity
              style={[
                styles.selectButton,
                selectedPlan === plan.id && styles.selectButtonActive,
                plan.id === 'free' && styles.selectButtonFree,
              ]}
              onPress={() => selectPlan(plan.id)}
            >
              <Text style={[
                styles.selectButtonText,
                selectedPlan === plan.id && styles.selectButtonTextActive,
                plan.id === 'free' && styles.selectButtonTextFree,
              ]}>
                {plan.id === 'free' ? 'Get Started' : 'Select Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderCompetitorComparison = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Why Choose OmniLister?</Text>
      <View style={styles.comparisonCard}>
        <LinearGradient
          colors={['rgba(0,122,255,0.1)', 'rgba(0,122,255,0.05)']}
          style={styles.comparisonGradient}
        >
          <View style={styles.comparisonHeader}>
            <Ionicons name="trophy" size={24} color="#007AFF" />
            <Text style={styles.comparisonTitle}>Market Leader</Text>
          </View>
          
          <View style={styles.comparisonGrid}>
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonItemTitle}>Free Listings</Text>
              <Text style={styles.comparisonItemValue}>150</Text>
              <Text style={styles.comparisonItemSubtext}>vs 100 (List Perfectly)</Text>
            </View>
            
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonItemTitle}>Starter Price</Text>
              <Text style={styles.comparisonItemValue}>$17.99</Text>
              <Text style={styles.comparisonItemSubtext}>vs $22.96 (Vendoo)</Text>
            </View>
            
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonItemTitle}>Enterprise</Text>
              <Text style={styles.comparisonItemValue}>$47.99</Text>
              <Text style={styles.comparisonItemSubtext}>vs $199 (Zentail)</Text>
            </View>
            
            <View style={styles.comparisonItem}>
              <Text style={styles.comparisonItemTitle}>Guarantee</Text>
              <Text style={styles.comparisonItemValue}>30 days</Text>
              <Text style={styles.comparisonItemSubtext}>Longest in market</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );

  const renderMoneyBackGuarantee = () => {
    const guarantee = pricingService.getMoneyBackGuarantee();
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Money-Back Guarantee</Text>
        <View style={styles.guaranteeCard}>
          <LinearGradient
            colors={['rgba(52,199,89,0.1)', 'rgba(52,199,89,0.05)']}
            style={styles.guaranteeGradient}
          >
            <View style={styles.guaranteeHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#34C759" />
              <Text style={styles.guaranteeTitle}>{guarantee.days}-Day Guarantee</Text>
            </View>
            
            <Text style={styles.guaranteeDescription}>
              {guarantee.description}
            </Text>
            
            <View style={styles.guaranteeTerms}>
              {guarantee.terms.map((term, index) => (
                <View key={index} style={styles.guaranteeTerm}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.guaranteeTermText}>{term}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const renderFeatures = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>All Features Included</Text>
      <View style={styles.featuresGrid}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <View style={styles.featureContent}>
              <Text style={styles.featureName}>{feature.name}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCompetitiveAdvantages = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Competitive Advantages</Text>
      <View style={styles.advantagesList}>
        {pricingService.getPricingHighlights().map((advantage, index) => (
          <View key={index} style={styles.advantageItem}>
            <Ionicons name="star" size={16} color="#FF9500" />
            <Text style={styles.advantageText}>{advantage}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderHeader()}
      {renderPricingPlans()}
      {renderCompetitorComparison()}
      {renderMoneyBackGuarantee()}
      {renderFeatures()}
      {renderCompetitiveAdvantages()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    padding: 4,
  },
  toggleText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 15,
  },
  toggleTextActive: {
    color: 'white',
  },
  savingsBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 10,
  },
  savingsBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  plansContainer: {
    marginHorizontal: -20,
  },
  planCard: {
    width: 280,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginRight: 15,
    marginLeft: 20,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    borderRadius: 15,
    alignItems: 'center',
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    right: 20,
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    borderRadius: 15,
    alignItems: 'center',
  },
  recommendedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  planName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  planPrice: {
    color: '#007AFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  planSavings: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: 'bold',
  },
  planFeatures: {
    marginBottom: 20,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  planFeatureText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
  },
  moreFeaturesText: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 5,
  },
  selectButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  selectButtonActive: {
    backgroundColor: '#007AFF',
  },
  selectButtonFree: {
    backgroundColor: '#34C759',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectButtonTextActive: {
    color: 'white',
  },
  selectButtonTextFree: {
    color: 'white',
  },
  comparisonCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  comparisonGradient: {
    padding: 20,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  comparisonTitle: {
    color: '#007AFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  comparisonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  comparisonItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  comparisonItemTitle: {
    color: '#666',
    fontSize: 14,
    marginBottom: 5,
  },
  comparisonItemValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  comparisonItemSubtext: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  guaranteeCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  guaranteeGradient: {
    padding: 20,
  },
  guaranteeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  guaranteeTitle: {
    color: '#34C759',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  guaranteeDescription: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  guaranteeTerms: {
    marginTop: 10,
  },
  guaranteeTerm: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  guaranteeTermText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  featureContent: {
    flex: 1,
    marginLeft: 10,
  },
  featureName: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  featureDescription: {
    color: '#666',
    fontSize: 12,
    lineHeight: 16,
  },
  advantagesList: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
  },
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  advantageText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
});
