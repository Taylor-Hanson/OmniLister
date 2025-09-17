import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AutomationRules from "@/components/AutomationRules";
import PoshmarkAutomationSettings from "@/components/PoshmarkAutomationSettings";
import AutomationTemplates from "@/components/AutomationTemplates";
import { Zap, Settings, MessageSquare, Shield } from "lucide-react";

export default function AutomationSettings() {
  const [activeTab, setActiveTab] = useState("rules");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Automation Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure automation rules, templates, and marketplace-specific settings
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-[600px]">
          <TabsTrigger value="rules" data-testid="tab-rules">
            <Zap className="mr-2 h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="poshmark" data-testid="tab-poshmark">
            <Settings className="mr-2 h-4 w-4" />
            Poshmark
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <MessageSquare className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <AutomationRules />
        </TabsContent>

        <TabsContent value="poshmark" className="space-y-6">
          <PoshmarkAutomationSettings />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <AutomationTemplates />
        </TabsContent>
      </Tabs>

      {/* Info Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Safety Notice:</strong> All automation settings include built-in safety features to protect your accounts. 
          We automatically respect platform rate limits, add random delays to mimic human behavior, and include circuit breakers 
          to pause automation if issues are detected.
        </AlertDescription>
      </Alert>
    </div>
  );
}