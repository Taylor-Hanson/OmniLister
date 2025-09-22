/**
 * OmniLister – Accordion utilities
 * --------------------------------------------------
 * Eliminates the nested <button> warning that React raises when Radix UI
 * primitives (Accordion.Trigger, Tabs.Trigger, Tooltip.Trigger, etc.) render
 * their own <button> while a second <button> exists inside.  The fix is to
 * pass `asChild` so that **only your child element** is rendered.
 * --------------------------------------------------
 */

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------
 * Re‑exports
 * ---------------------------------------------------------------------- */

export const Accordion = AccordionPrimitive.Root;

/* -------------------------------------------------------------------------
 * AccordionItem
 * ---------------------------------------------------------------------- */

export const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

/* -------------------------------------------------------------------------
 * AccordionTrigger – FIXED (uses `asChild`, correct ref type, no JSX comments)
 * ---------------------------------------------------------------------- */

export const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex w-full items-center">
    {/* Radix clones this child; no additional <button> is rendered. */}
    <AccordionPrimitive.Trigger asChild ref={ref} {...props}>
      <div
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
          "[&[data-state=open]>svg]:rotate-180",
          className,
        )}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      </div>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

/* -------------------------------------------------------------------------
 * AccordionContent
 * ---------------------------------------------------------------------- */

export const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-sm",
      "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className,
    )}
    {...props}
  >
    <div className="pb-4 pt-0">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";
