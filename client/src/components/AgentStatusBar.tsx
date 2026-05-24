import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { trpc } from "../lib/trpc";

export default function AgentStatusBar() {
  const { data: lastRun, isLoading } = trpc.agent.getLastRun.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 size={12} className="animate-spin" />
        <span>Loading agent status…</span>
      </div>
    );
  }

  if (!lastRun) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Clock size={12} />
        <span>No agent runs yet</span>
      </div>
    );
  }

  const statusConfig = {
    running: {
      icon: <Loader2 size={12} className="animate-spin" />,
      label: "Running",
      variant: "secondary" as const,
      color: "text-primary",
    },
    success: {
      icon: <CheckCircle2 size={12} />,
      label: "Success",
      variant: "secondary" as const,
      color: "text-green-400",
    },
    failed: {
      icon: <XCircle size={12} />,
      label: "Failed",
      variant: "destructive" as const,
      color: "text-red-400",
    },
  };

  const config = statusConfig[lastRun.status];

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-1.5 text-xs ${config.color}`}>
        {config.icon}
        <span>Last run: {lastRun.runDate}</span>
      </div>
      <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">
        {config.label}
      </Badge>
      {lastRun.status === "success" && (
        <span className="text-xs text-muted-foreground hidden lg:block">
          {lastRun.topicsAdded} topics · {lastRun.keywordsUpdated} keywords · {lastRun.gapsFound} gaps
        </span>
      )}
    </div>
  );
}
