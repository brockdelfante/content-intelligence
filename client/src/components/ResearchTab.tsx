import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart2, ExternalLink, Globe, Loader2, Newspaper, TrendingUp } from "lucide-react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

export default function ResearchTab() {
  const { data: summaries = [], isLoading } = trpc.research.list.useQuery(
    { limit: 30 },
    { refetchInterval: 60_000 }
  );

  const [selectedDate, setSelectedDate] = useState<string>("");

  const summary =
    summaries.find((s) => s.runDate === selectedDate) ?? summaries[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading research data…</span>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Newspaper size={32} className="opacity-30" />
        <p className="text-sm">No research summaries yet</p>
        <p className="text-xs opacity-60">Run the agent to generate today's research summary</p>
      </div>
    );
  }

  const newsItems = (summary?.newsItems ?? []) as {
    title: string;
    source: string;
    summary: string;
    url?: string;
    publishedDate?: string;
    publication?: string;
  }[];
  const trends = (summary?.trends ?? []) as { trend: string; relevance: string }[];
  const competitors = (summary?.competitorActivity ?? []) as {
    competitor: string;
    activity: string;
    topics: string[];
  }[];

  return (
    <div className="space-y-5">
      {/* Date selector */}
      <div className="flex items-center gap-3">
        <Select
          value={selectedDate || summaries[0]?.runDate}
          onValueChange={setSelectedDate}
        >
          <SelectTrigger className="h-8 w-44 text-sm bg-card border-border">
            <SelectValue placeholder="Select date" />
          </SelectTrigger>
          <SelectContent>
            {summaries.map((s) => (
              <SelectItem key={s.runDate} value={s.runDate}>
                {s.runDate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          Showing {summaries.length} daily report{summaries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Overall summary */}
      {summary?.overallSummary && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">{summary.overallSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* News */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <Newspaper size={14} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">News & Events</h3>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {newsItems.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {newsItems.map((item, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors"
              >
                {/* Title */}
                <p className="text-sm font-medium text-foreground line-clamp-2 mb-1.5">
                  {item.title}
                </p>
                {/* Meta row: publication · date · link */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-primary/70">
                    {item.publication ?? item.source}
                  </span>
                  {item.publishedDate && (
                    <>
                      <span className="text-muted-foreground/40 text-[10px]">·</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {item.publishedDate}
                      </span>
                    </>
                  )}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors border border-primary/20 hover:border-primary/40 rounded px-1.5 py-0.5"
                    >
                      <ExternalLink size={9} />
                      Read article
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trends + Competitors */}
        <div className="space-y-4">
          {/* Trends */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Trends</h3>
            </div>
            <div className="space-y-2">
              {trends.map((t, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-medium text-foreground">{t.trend}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {t.relevance}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor activity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Competitor Activity</h3>
            </div>
            <div className="space-y-2">
              {competitors.map((c, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-semibold text-foreground">{c.competitor}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{c.activity}</p>
                  {c.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.topics.slice(0, 3).map((topic, j) => (
                        <span
                          key={j}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
