import AutomationLogs from "@/components/AutomationLogs";
import { FileText } from "lucide-react";

export default function AutomationLogsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Automation Activity Logs
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor, debug, and analyze your automation activity in real-time
        </p>
      </div>

      {/* Logs Component */}
      <AutomationLogs />
    </div>
  );
}