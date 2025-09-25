import { storage } from "../storage";
import type { OnboardingProgress } from "../shared/schema.ts";

// Define the onboarding steps configuration
export const ONBOARDING_STEPS = [
  {
    id: 0,
    name: "welcome",
    title: "Welcome to CrossList Pro",
    description: "Your ultimate multi-channel listing tool",
    element: null,
  },
  {
    id: 1,
    name: "dashboard",
    title: "Dashboard Overview",
    description: "Track your performance across all marketplaces",
    element: "dashboard-content",
  },
  {
    id: 2,
    name: "create-listing",
    title: "Creating Your First Listing",
    description: "Learn how to create and manage your product listings",
    element: "create-listing-button",
  },
  {
    id: 3,
    name: "marketplaces",
    title: "Connecting Marketplaces",
    description: "Connect eBay, Poshmark, Mercari, and more",
    element: "marketplaces-link",
  },
  {
    id: 4,
    name: "bulk-management",
    title: "Bulk Management",
    description: "Manage multiple listings efficiently",
    element: "bulk-manager-link",
  },
  {
    id: 5,
    name: "ai-features",
    title: "AI-Powered Features",
    description: "Use AI to recognize products and create listings from voice",
    element: "ai-scanner-button",
  },
  {
    id: 6,
    name: "sync-auto-delist",
    title: "Sync & Auto-Delist",
    description: "Keep your inventory synchronized and automate delisting",
    element: "sync-link",
  },
  {
    id: 7,
    name: "analytics",
    title: "Analytics & Insights",
    description: "Understand your sales performance and trends",
    element: "analytics-link",
  },
  {
    id: 8,
    name: "completion",
    title: "You're All Set!",
    description: "Congratulations on completing the tutorial",
    element: null,
  },
];

class OnboardingService {
  async getProgress(userId: string): Promise<OnboardingProgress | null> {
    try {
      const progress = await storage.getOnboardingProgress(userId);
      if (!progress) {
        // Create initial progress for new users
        const newProgress = await storage.createOnboardingProgress(userId, {
          currentStep: 0,
          completedSteps: [],
          skipped: false,
        });
        return newProgress;
      }
      return progress;
    } catch (error) {
      console.error("Error getting onboarding progress:", error);
      return null;
    }
  }

  async updateProgress(
    userId: string, 
    currentStep: number, 
    completedStep?: number
  ): Promise<OnboardingProgress | null> {
    try {
      const progress = await this.getProgress(userId);
      if (!progress) return null;

      const completedSteps = progress.completedSteps as number[] || [];
      
      // Add the completed step if provided and not already in the array
      if (completedStep !== undefined && !completedSteps.includes(completedStep)) {
        completedSteps.push(completedStep);
      }

      const updatedProgress = await storage.updateOnboardingProgress(userId, {
        currentStep,
        completedSteps,
      });

      return updatedProgress;
    } catch (error) {
      console.error("Error updating onboarding progress:", error);
      return null;
    }
  }

  async completeOnboarding(userId: string): Promise<OnboardingProgress | null> {
    try {
      // Mark all steps as completed
      const allStepIds = ONBOARDING_STEPS.map(step => step.id);
      await storage.updateOnboardingProgress(userId, {
        currentStep: ONBOARDING_STEPS.length - 1,
        completedSteps: allStepIds,
      });
      
      const progress = await storage.completeOnboarding(userId);
      return progress;
    } catch (error) {
      console.error("Error completing onboarding:", error);
      return null;
    }
  }

  async skipOnboarding(userId: string): Promise<OnboardingProgress | null> {
    try {
      const progress = await storage.skipOnboarding(userId);
      return progress;
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      return null;
    }
  }

  async resetOnboarding(userId: string): Promise<OnboardingProgress | null> {
    try {
      const progress = await storage.resetOnboarding(userId);
      return progress;
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      return null;
    }
  }

  getStepById(stepId: number) {
    return ONBOARDING_STEPS.find(step => step.id === stepId);
  }

  getNextStep(currentStep: number): number | null {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      return currentStep + 1;
    }
    return null;
  }

  getPreviousStep(currentStep: number): number | null {
    if (currentStep > 0) {
      return currentStep - 1;
    }
    return null;
  }

  calculateProgress(completedSteps: number[]): number {
    const totalSteps = ONBOARDING_STEPS.length - 1; // Exclude completion step
    const completed = completedSteps.filter(step => step < totalSteps).length;
    return Math.round((completed / totalSteps) * 100);
  }
}

export const onboardingService = new OnboardingService();