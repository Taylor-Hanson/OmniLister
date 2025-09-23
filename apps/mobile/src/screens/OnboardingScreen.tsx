// Improved Onboarding Screen - Clean, value-focused onboarding

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}

export default function OnboardingScreen({ navigation }: any) {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Welcome to OmniLister',
      subtitle: 'The Ultimate Cross-Listing Platform',
      description: 'List once, sell everywhere. Connect to 15+ marketplaces and maximize your sales potential.',
      icon: 'rocket',
      color: '#007AFF',
      features: [
        '15+ Marketplace Integrations',
        'AI-Powered Optimization',
        'Real-time Analytics',
        'Team Collaboration',
      ],
    },
    {
      id: 2,
      title: 'Enterprise Features',
      subtitle: 'Amazon & Walmart Integration',
      description: 'Access enterprise-level features at a fraction of the cost. Connect to Amazon Seller Central and Walmart Marketplace.',
      icon: 'business',
      color: '#FF9900',
      features: [
        'Amazon Seller Central',
        'Walmart Marketplace',
        'Dynamic Repricing',
        'Advanced Analytics',
      ],
    },
    {
      id: 3,
      title: 'AI-Powered Automation',
      subtitle: 'Dual AI Technology',
      description: 'First platform to use GPT-5 + Claude simultaneously for maximum accuracy and reliability.',
      icon: 'sparkles',
      color: '#34C759',
      features: [
        'GPT-5 + Claude AI',
        'Smart Scheduling',
        'Auto-Repricing',
        'Offer Management',
      ],
    },
    {
      id: 4,
      title: 'Mobile Excellence',
      subtitle: 'Native iOS & Android Apps',
      description: 'Take photos, manage inventory, and respond to buyers on the go with our native mobile apps.',
      icon: 'phone-portrait',
      color: '#AF52DE',
      features: [
        'Native Mobile Apps',
        'Camera Integration',
        'Push Notifications',
        'Offline Capability',
      ],
    },
  ];

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      scrollViewRef.current?.scrollTo({
        x: nextStepIndex * width,
        animated: true,
      });
    } else {
      // Complete onboarding
      navigation.replace('Auth');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      scrollViewRef.current?.scrollTo({
        x: prevStepIndex * width,
        animated: true,
      });
    }
  };

  const skipOnboarding = () => {
    navigation.replace('Auth');
  };

  const renderStep = (step: OnboardingStep, index: number) => (
    <View key={step.id} style={styles.stepContainer}>
      <View style={styles.stepContent}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: step.color }]}>
          <Ionicons name={step.icon as any} size={48} color="white" />
        </View>

        {/* Title */}
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
        <Text style={styles.stepDescription}>{step.description}</Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {step.features.map((feature, featureIndex) => (
            <View key={featureIndex} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={step.color} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={styles.scrollView}
        >
          {onboardingSteps.map((step, index) => renderStep(step, index))}
        </ScrollView>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.buttonContainer}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <Ionicons name="arrow-back" size={20} color="#007AFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
            <LinearGradient
              colors={[onboardingSteps[currentStep].color, onboardingSteps[currentStep].color + 'CC']}
              style={styles.gradientButton}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Value Proposition */}
        <View style={styles.valueProposition}>
          <Text style={styles.valueText}>
            Join thousands of sellers who've increased their revenue by 40%+
          </Text>
          <View style={styles.valueStats}>
            <View style={styles.valueStat}>
              <Text style={styles.valueStatNumber}>15+</Text>
              <Text style={styles.valueStatLabel}>Marketplaces</Text>
            </View>
            <View style={styles.valueStat}>
              <Text style={styles.valueStatNumber}>40%</Text>
              <Text style={styles.valueStatLabel}>More Sales</Text>
            </View>
            <View style={styles.valueStat}>
              <Text style={styles.valueStatNumber}>2hrs</Text>
              <Text style={styles.valueStatLabel}>Saved Daily</Text>
            </View>
          </View>
        </View>
      </View>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  skipButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  stepContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  stepTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  stepSubtitle: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  stepDescription: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  featuresContainer: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  nextButton: {
    flex: 1,
    marginLeft: 20,
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 15,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  valueProposition: {
    alignItems: 'center',
  },
  valueText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  valueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  valueStat: {
    alignItems: 'center',
  },
  valueStatNumber: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  valueStatLabel: {
    color: '#666',
    fontSize: 12,
  },
});
