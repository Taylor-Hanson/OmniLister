import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";

interface OnboardingTooltipProps {
  targetElement: string;
  title: string;
  description: string;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStep: number;
  totalSteps: number;
}

export default function OnboardingTooltip({
  targetElement,
  title,
  description,
  onNext,
  onPrevious,
  onSkip,
  isFirstStep,
  isLastStep,
  currentStep,
  totalSteps,
}: OnboardingTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [placement, setPlacement] = useState<"top" | "bottom" | "left" | "right">("bottom");
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculatePosition = () => {
      const element = document.querySelector(`[data-testid="${targetElement}"]`);
      if (!element || !tooltipRef.current) return;

      const rect = element.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      const spacing = 20;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate available space in each direction
      const spaceTop = rect.top;
      const spaceBottom = viewportHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;

      // Determine best placement
      let bestPlacement: "top" | "bottom" | "left" | "right" = "bottom";
      let newPosition = { top: 0, left: 0 };

      // Try bottom first
      if (spaceBottom >= tooltipRect.height + spacing) {
        bestPlacement = "bottom";
        newPosition = {
          top: rect.bottom + spacing,
          left: Math.max(
            spacing,
            Math.min(
              rect.left + rect.width / 2 - tooltipRect.width / 2,
              viewportWidth - tooltipRect.width - spacing
            )
          ),
        };
      }
      // Try top
      else if (spaceTop >= tooltipRect.height + spacing) {
        bestPlacement = "top";
        newPosition = {
          top: rect.top - tooltipRect.height - spacing,
          left: Math.max(
            spacing,
            Math.min(
              rect.left + rect.width / 2 - tooltipRect.width / 2,
              viewportWidth - tooltipRect.width - spacing
            )
          ),
        };
      }
      // Try right
      else if (spaceRight >= tooltipRect.width + spacing) {
        bestPlacement = "right";
        newPosition = {
          top: Math.max(
            spacing,
            Math.min(
              rect.top + rect.height / 2 - tooltipRect.height / 2,
              viewportHeight - tooltipRect.height - spacing
            )
          ),
          left: rect.right + spacing,
        };
      }
      // Try left
      else if (spaceLeft >= tooltipRect.width + spacing) {
        bestPlacement = "left";
        newPosition = {
          top: Math.max(
            spacing,
            Math.min(
              rect.top + rect.height / 2 - tooltipRect.height / 2,
              viewportHeight - tooltipRect.height - spacing
            )
          ),
          left: rect.left - tooltipRect.width - spacing,
        };
      }
      // Default to centered on screen if no good placement
      else {
        bestPlacement = "bottom";
        newPosition = {
          top: viewportHeight / 2 - tooltipRect.height / 2,
          left: viewportWidth / 2 - tooltipRect.width / 2,
        };
      }

      setPlacement(bestPlacement);
      setPosition(newPosition);

      // Add pulsing effect to target element
      element.classList.add("onboarding-highlight");
    };

    calculatePosition();
    window.addEventListener("resize", calculatePosition);
    window.addEventListener("scroll", calculatePosition);

    return () => {
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("scroll", calculatePosition);
      
      // Remove highlight class
      const element = document.querySelector(`[data-testid="${targetElement}"]`);
      if (element) {
        element.classList.remove("onboarding-highlight");
      }
    };
  }, [targetElement]);

  // Arrow pointing to the target element
  const getArrowStyles = () => {
    const baseArrowStyles = "absolute w-0 h-0 border-solid";
    
    switch (placement) {
      case "top":
        return `${baseArrowStyles} -bottom-2 left-1/2 transform -translate-x-1/2 
                border-l-[10px] border-l-transparent 
                border-r-[10px] border-r-transparent 
                border-t-[10px] border-t-background`;
      case "bottom":
        return `${baseArrowStyles} -top-2 left-1/2 transform -translate-x-1/2 
                border-l-[10px] border-l-transparent 
                border-r-[10px] border-r-transparent 
                border-b-[10px] border-b-background`;
      case "left":
        return `${baseArrowStyles} -right-2 top-1/2 transform -translate-y-1/2 
                border-t-[10px] border-t-transparent 
                border-b-[10px] border-b-transparent 
                border-l-[10px] border-l-background`;
      case "right":
        return `${baseArrowStyles} -left-2 top-1/2 transform -translate-y-1/2 
                border-t-[10px] border-t-transparent 
                border-b-[10px] border-b-transparent 
                border-r-[10px] border-r-background`;
      default:
        return "";
    }
  };

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 10000,
      }}
      className="pointer-events-auto"
      data-testid="onboarding-tooltip"
    >
      <Card className="relative p-6 shadow-2xl border-2 max-w-md">
        {/* Arrow pointing to element */}
        <div className={getArrowStyles()} />

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={onSkip}
          data-testid="onboarding-tooltip-close"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg leading-tight">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                disabled={isFirstStep}
                data-testid="onboarding-tooltip-prev"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              
              <Button
                size="sm"
                onClick={onNext}
                data-testid="onboarding-tooltip-next"
              >
                {isLastStep ? "Finish" : "Next"}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}