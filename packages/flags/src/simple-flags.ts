// Simple flag function for testing
export function flag(name: string): boolean {
  console.log(`Checking flag: ${name}`);
  
  // Mock flag values for testing
  const mockFlags: Record<string, boolean> = {
    'mobile.dualAi': true,
    'mobile.offlineQueue': true,
    'mobile.pushNotifications': true,
    'mobile.cameraListing': true,
    'web.pricingAutomation': false,
    'web.analytics': false,
    'dualAi.routeSelection': false,
    'bulkOperations': false,
    'advancedAutomation': false,
    'paywall.advancedAutomation': false,
    'paywall.bulkAnalytics': false,
    'paywall.premiumSupport': false,
  };
  
  return mockFlags[name] || false;
}

// Simple platform detection
export function isMobile(): boolean {
  return typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent);
}

export function isWeb(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
