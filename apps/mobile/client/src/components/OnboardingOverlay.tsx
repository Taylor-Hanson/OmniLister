import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface OnboardingOverlayProps {
  targetElement: string;
}

export default function OnboardingOverlay({ targetElement }: OnboardingOverlayProps) {
  const [spotlightStyles, setSpotlightStyles] = useState<React.CSSProperties>({});

  useEffect(() => {
    const calculateSpotlight = () => {
      const element = document.querySelector(`[data-testid="${targetElement}"]`);
      if (!element) {
        setSpotlightStyles({});
        return;
      }

      const rect = element.getBoundingClientRect();
      const padding = 10; // Padding around the highlighted element

      // Create a clip-path that shows only the target element
      const clipPath = `
        polygon(
          0 0,
          0 100vh,
          ${rect.left - padding}px 100vh,
          ${rect.left - padding}px ${rect.top - padding}px,
          ${rect.right + padding}px ${rect.top - padding}px,
          ${rect.right + padding}px ${rect.bottom + padding}px,
          ${rect.left - padding}px ${rect.bottom + padding}px,
          ${rect.left - padding}px 100vh,
          100vw 100vh,
          100vw 0
        )
      `;

      setSpotlightStyles({
        clipPath,
      });

      // Add spotlight class to the element for additional styling
      element.classList.add("onboarding-spotlight");
      
      // Ensure the element is visible and scrolled into view
      element.scrollIntoView({ 
        behavior: "smooth", 
        block: "center", 
        inline: "center" 
      });
    };

    calculateSpotlight();
    
    // Recalculate on window resize or scroll
    window.addEventListener("resize", calculateSpotlight);
    window.addEventListener("scroll", calculateSpotlight);

    return () => {
      window.removeEventListener("resize", calculateSpotlight);
      window.removeEventListener("scroll", calculateSpotlight);
      
      // Remove spotlight class
      const element = document.querySelector(`[data-testid="${targetElement}"]`);
      if (element) {
        element.classList.remove("onboarding-spotlight");
      }
    };
  }, [targetElement]);

  return (
    <>
      {/* Dark overlay with cutout for target element */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9997] pointer-events-none"
        style={spotlightStyles}
        data-testid="onboarding-overlay"
      >
        <div className="absolute inset-0 bg-black/60" />
      </motion.div>

      {/* Invisible click blocker except for the highlighted area */}
      <div 
        className="fixed inset-0 z-[9996]"
        style={{ pointerEvents: "auto" }}
        onClick={(e) => e.stopPropagation()}
        data-testid="onboarding-click-blocker"
      >
        <div
          style={{
            position: "absolute",
            ...(Object.keys(spotlightStyles).length > 0 && {
              clipPath: spotlightStyles.clipPath,
              pointerEvents: "none",
            }),
          }}
        />
      </div>
    </>
  );
}