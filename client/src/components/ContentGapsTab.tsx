import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart2, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";

const PRIORITY_CONFIG = {
  high: {
    label: "High Priority",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
    barColor: "bg-red-500",
  },
  medium: {
    label: "Medium Priority",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    barColor: "bg-yellow-500",
  },
  low: {
    label: "Low Priority",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
    barColor: "bg-green-500",
  },
};

export default function ContentGapsTab() {
  const { data: gaps = [], isLoading } = trpc.contentGaps.list.useQuery(
    { limit: 50 },
    { refetchInterval: 60_000 }
  );

  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const dates = useMemo(() => Array.from(new Set(gaps.map((g) => g.runDate))).sort().reverse(), [gaps]);

  const filtered = useMemo(() => {
    let result = [...gaps];
    if (priorityFilter !== "all") result = result.filter((g) => g.priority === priorityFilter);
    if (dateFilter !== "all") result = result.filter((g) => g.runDate === dateFilter);
    return result;
  }, [gaps, priorityFilter, dateFilter]);

  const highCount = gaps.filter((g) => g.priority === "high").length;
  const medCount = gaps.filter((g) => g.priority === "medium").length;
  const lowCount = gaps.filter((g) => g.priority === "low").length;
  const latestPostsAnalyzed = gaps[0]?.hubspotPostsAnalyzed ?? 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "HubSpot Posts Analysed", value: latestPostsAnalyzed },
          { label: "High Priority Gaps", value: highCount },
          { label: "Medium Priority", value: medCount },
          { label: "Low Priority", value: lowCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
            <p className="text-lg font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 w-40 text-sm bg-card border-border">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="h-8 w-40 text-sm bg-card border-border">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            {dates.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} gap{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Gap cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading content gaps…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <BarChart2 size={32} className="opacity-30" />
          <p className="text-sm">No content gaps found</p>
          <p className="text-xs opacity-60">Run the agent to analyse your HubSpot content</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((gap) => {
            const priorityCfg = PRIORITY_CONFIG[gap.priority];
            const keywords = gap.suggestedKeywords as string[];
            return (
              <div
                key={gap.id}
                className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-semibold text-foreground leading-snug">
                    {gap.gapTitle}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${priorityCfg.className}`}
                  >
                    {priorityCfg.label}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {gap.gapDescription}
                </p>

                {gap.category && (
                  <p className="text-[11px] text-primary/70 mb-2 font-medium">{gap.category}</p>
                )}

                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary/80 font-mono"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                  <span>Analysed {gap.hubspotPostsAnalyzed} HubSpot posts</span>
                  <span>{gap.runDate}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
