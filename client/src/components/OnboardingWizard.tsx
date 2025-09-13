import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, X, Sparkles, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OnboardingTooltip from "./OnboardingTooltip";
import OnboardingOverlay from "./OnboardingOverlay";
import confetti from "canvas-confetti";

interface OnboardingStep {
  id: number;
  name: string;
  title: string;
  description: string;
  element: string | null;
}

interface OnboardingProgress {
  id: string;
  userId: string;
  currentStep: number;
  completedSteps: number[];
  skipped: boolean;
  completedAt: Date | null;
  startedAt: Date;
  updatedAt: Date;
}

export default function OnboardingWizard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Fetch onboarding progress
  const { data: onboardingData, isLoading } = useQuery({
    queryKey: ["/api/onboarding/progress"],
    retry: false,
  });

  const progress = onboardingData?.progress as OnboardingProgress;
  const steps = onboardingData?.steps as OnboardingStep[];
  const progressPercentage = onboardingData?.progressPercentage || 0;

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: (data: { currentStep: number; completedStep?: number }) =>
      apiRequest("/api/onboarding/progress", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      setCompletedSteps(data.progress.completedSteps || []);
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
    },
  });

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/onboarding/complete", { method: "POST" }),
    onSuccess: () => {
      triggerConfetti();
      toast({
        title: "🎉 Congratulations!",
        description: "You've completed the onboarding tutorial!",
      });
      setTimeout(() => {
        setIsVisible(false);
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }, 3000);
    },
  });

  // Skip onboarding mutation
  const skipOnboardingMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/onboarding/skip", { method: "POST" }),
    onSuccess: () => {
      setIsVisible(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Tutorial Skipped",
        description: "You can restart it anytime from settings.",
      });
    },
  });

  useEffect(() => {
    if (progress && !progress.skipped && !progress.completedAt) {
      setIsVisible(true);
      setCurrentStep(progress.currentStep || 0);
      setCompletedSteps(progress.completedSteps || []);
    }
  }, [progress]);

  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const handleNext = () => {
    if (!steps) return;
    
    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    setCurrentStep(nextStep);
    
    // Mark current step as completed
    updateProgressMutation.mutate({
      currentStep: nextStep,
      completedStep: currentStep,
    });

    // Check if this is the final step
    if (nextStep === steps.length - 1) {
      completeOnboardingMutation.mutate();
    }
  };

  const handlePrevious = () => {
    const prevStep = Math.max(currentStep - 1, 0);
    setCurrentStep(prevStep);
    updateProgressMutation.mutate({ currentStep: prevStep });
  };

  const handleSkip = () => {
    skipOnboardingMutation.mutate();
  };

  const handleStepClick = (stepIndex: number) => {
    if (completedSteps.includes(stepIndex) || stepIndex === 0) {
      setCurrentStep(stepIndex);
      updateProgressMutation.mutate({ currentStep: stepIndex });
    }
  };

  if (isLoading || !isVisible || !steps) {
    return null;
  }

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Overlay for spotlight effect */}
      {currentStepData.element && (
        <OnboardingOverlay targetElement={currentStepData.element} />
      )}

      {/* Main onboarding content */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
          data-testid="onboarding-wizard"
        >
          {/* Tooltip for highlighted element */}
          {currentStepData.element && !isFirstStep && !isLastStep && (
            <OnboardingTooltip
              targetElement={currentStepData.element}
              title={currentStepData.title}
              description={currentStepData.description}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSkip={handleSkip}
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
              currentStep={currentStep}
              totalSteps={steps.length}
            />
          )}

          {/* Welcome and completion cards */}
          {(isFirstStep || isLastStep) && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="pointer-events-auto"
            >
              <Card className="w-[500px] max-w-[90vw] p-8 shadow-2xl border-2">
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4"
                  onClick={handleSkip}
                  data-testid="onboarding-close"
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Content */}
                <div className="text-center space-y-6">
                  {isFirstStep ? (
                    <>
                      <div className="flex justify-center">
                        <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                          <Sparkles className="h-10 w-10 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold mb-3">
                          Welcome to CrossList Pro! 🎉
                        </h2>
                        <p className="text-muted-foreground text-lg">
                          Your ultimate multi-channel listing tool
                        </p>
                      </div>
                      <p className="text-muted-foreground">
                        Let's take a quick tour to help you get started with all the
                        powerful features that will supercharge your selling experience
                        across multiple marketplaces.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button
                          variant="outline"
                          onClick={handleSkip}
                          data-testid="onboarding-skip"
                        >
                          Skip Tutorial
                        </Button>
                        <Button
                          onClick={handleNext}
                          data-testid="onboarding-start"
                        >
                          Start Tour
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-center">
                        <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-10 w-10 text-green-500" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold mb-3">
                          You're All Set! 🚀
                        </h2>
                        <p className="text-muted-foreground text-lg">
                          Congratulations on completing the tutorial!
                        </p>
                      </div>
                      <p className="text-muted-foreground">
                        You now have all the knowledge you need to start crosslisting
                        like a pro. Create your first listing, connect your
                        marketplaces, and watch your sales grow!
                      </p>
                      <Button
                        onClick={() => setIsVisible(false)}
                        className="w-full"
                        data-testid="onboarding-finish"
                      >
                        Get Started
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress indicator */}
      {!isFirstStep && !isLastStep && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-auto"
        >
          <Card className="p-4 shadow-lg">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={isFirstStep}
                data-testid="onboarding-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    disabled={!completedSteps.includes(index) && index !== 0 && index !== currentStep}
                    className={`
                      w-2 h-2 rounded-full transition-all
                      ${index === currentStep 
                        ? "w-8 bg-primary" 
                        : completedSteps.includes(index)
                        ? "bg-primary"
                        : "bg-muted-foreground/30"}
                      ${(completedSteps.includes(index) || index === 0) && index !== currentStep
                        ? "cursor-pointer hover:bg-primary/80"
                        : "cursor-default"}
                    `}
                    data-testid={`onboarding-step-${index}`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={isLastStep}
                data-testid="onboarding-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <div className="text-sm text-muted-foreground ml-2">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
            
            <Progress value={progressPercentage} className="mt-3" />
          </Card>
        </motion.div>
      )}
    </>
  );
}