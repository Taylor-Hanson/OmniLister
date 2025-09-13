import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface TopNavigationProps {
  onMenuClick: () => void;
}

export default function TopNavigation({ onMenuClick }: TopNavigationProps) {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const [searchQuery, setSearchQuery] = useState("");

  const handleVoiceRecording = () => {
    // TODO: Implement voice recording functionality
    console.log("Voice recording started");
  };

  const handleAICamera = () => {
    // TODO: Implement AI camera functionality
    console.log("AI camera opened");
  };

  return (
    <header className="bg-card border-b border-border px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        {/* Mobile menu button */}
        <button 
          className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
          onClick={onMenuClick}
          data-testid="button-mobile-menu"
        >
          <i className="fas fa-bars text-xl"></i>
        </button>
        
        {/* Search */}
        <div className="flex-1 max-w-lg mx-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-muted-foreground text-sm"></i>
            </div>
            <Input
              type="text"
              placeholder="Search listings, products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-border focus:ring-2 focus:ring-ring focus:border-transparent"
              data-testid="input-search"
            />
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          {isConnected && (
            <Badge variant="outline" className="hidden sm:flex items-center text-green-600 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              Live
            </Badge>
          )}
          
          {/* Voice Recording Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVoiceRecording}
            className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
            title="Voice to Listing"
            data-testid="button-voice-recording"
          >
            <i className="fas fa-microphone text-lg"></i>
          </Button>
          
          {/* AI Camera Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAICamera}
            className="p-2 text-muted-foreground hover:text-secondary hover:bg-secondary/10 transition-colors"
            title="AI Product Scanner"
            data-testid="button-ai-camera"
          >
            <i className="fas fa-camera-retro text-lg"></i>
          </Button>
          
          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-notifications"
          >
            <i className="fas fa-bell text-lg"></i>
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
