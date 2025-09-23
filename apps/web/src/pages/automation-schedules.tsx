import AutomationSchedules from "@/components/AutomationSchedules";
import { Calendar } from "lucide-react";

export default function AutomationSchedulesPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Automation Schedules
        </h1>
        <p className="text-muted-foreground mt-2">
          Create and manage automated tasks with custom schedules and rules
        </p>
      </div>

      {/* Schedules Component */}
      <AutomationSchedules />
    </div>
  );
}