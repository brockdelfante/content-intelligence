import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  BarChart2,
  BookOpen,
  ChevronDown,
  Key,
  Layers,
  Loader2,
  LogOut,
  Play,
  RefreshCw,
  Search,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";
import AgentStatusBar from "../components/AgentStatusBar";
import ContentGapsTab from "../components/ContentGapsTab";
import KeywordsTab from "../components/KeywordsTab";
import ResearchTab from "../components/ResearchTab";
import TopicQueueTab from "../components/TopicQueueTab";
import BaseKeywordsTab from "../components/BaseKeywordsTab";

type Tab = "queue" | "research" | "keywords" | "gaps" | "base-keywords";

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "queue",
    label: "Topic Queue",
    icon: <Layers size={16} />,
    description: "Ranked topic recommendations",
  },
  {
    id: "research",
    label: "Research Summary",
    icon: <Search size={16} />,
    description: "Daily news & trends",
  },
  {
    id: "keywords",
    label: "Keywords",
    icon: <Key size={16} />,
    description: "SEO keyword intelligence",
  },
  {
    id: "gaps",
    label: "Content Gaps",
    icon: <BarChart2 size={16} />,
    description: "HubSpot gap analysis",
  },
  {
    id: "base-keywords",
    label: "Keyword Scope",
    icon: <BookOpen size={16} />,
    description: "Configure agent keywords",
  },
];

export default function Dashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("queue");

  const triggerAgent = trpc.agent.triggerRun.useMutation({
    onSuccess: () => {
      toast.success("Agent run started", {
        description: "Research and ranking will complete in the background.",
      });
    },
    onError: (err) => {
      toast.error("Failed to start agent", { description: err.message });
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap size={28} className="text-primary" />
              <span className="text-2xl font-semibold text-foreground">Content Intelligence</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              AI-powered content research and topic queue management for Australian property finance.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={() => (window.location.href = getLoginUrl())}
          >
            Sign in to continue
          </Button>
        </div>
      </div>
    );
  }

  const activeItem = NAV_ITEMS.find((n) => n.id === activeTab);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Zap size={14} className="text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
              Content Intelligence
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">Property Finance AU</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors duration-150 group ${
                activeTab === item.id
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <span
                className={`shrink-0 transition-colors ${
                  activeTab === item.id ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                }`}
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Agent trigger */}
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <Button
            size="sm"
            className="w-full gap-2"
            variant="outline"
            onClick={() => triggerAgent.mutate()}
            disabled={triggerAgent.isPending}
          >
            {triggerAgent.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} />
            )}
            Run Agent Now
          </Button>
        </div>

        {/* User */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {(user?.name ?? user?.email ?? "U")[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user?.name ?? user?.email ?? "User"}
              </p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={() => logout()}
              className="shrink-0 text-sidebar-foreground/30 hover:text-sidebar-foreground/70 transition-colors"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-foreground">{activeItem?.label}</h1>
            <p className="text-xs text-muted-foreground">{activeItem?.description}</p>
          </div>
          <AgentStatusBar />
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "queue" && <TopicQueueTab />}
          {activeTab === "research" && <ResearchTab />}
          {activeTab === "keywords" && <KeywordsTab />}
          {activeTab === "gaps" && <ContentGapsTab />}
          {activeTab === "base-keywords" && <BaseKeywordsTab />}
        </div>
      </main>
    </div>
  );
}
