import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  Filter,
  Loader2,
  Newspaper,
  Search,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";
import { SocialSchedulerModal } from "./SocialSchedulerModal";

type SortField = "score" | "category" | "createdAt";
type SortDir = "asc" | "desc";

const STATUS_CONFIG = {
  new: {
    label: "New",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  approved: {
    label: "Approved",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
  removed: {
    label: "Removed",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 75
      ? "bg-green-500"
      : pct >= 50
      ? "bg-yellow-500"
      : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">
        {pct.toFixed(0)}
      </span>
    </div>
  );
}

export default function TopicQueueTab() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [selectedTopicForSocial, setSelectedTopicForSocial] = useState<any>(null);

  // Default query excludes removed topics; only include them when explicitly filtered
  const queryInput = statusFilter === "removed"
    ? { status: "removed" as const }
    : statusFilter === "approved"
    ? { status: "approved" as const }
    : statusFilter === "new"
    ? { status: "new" as const }
    : undefined; // "all" — fetch everything then filter client-side

  const { data: allTopics = [], isLoading } = trpc.topics.list.useQuery(
    queryInput,
    { refetchInterval: 60_000 }
  );

  // Hide removed topics unless the user explicitly selects the "removed" filter
  const topics = statusFilter === "removed"
    ? allTopics
    : allTopics.filter((t) => t.status !== "removed");

  const handlePostToSocial = (topic: any) => {
    setSelectedTopicForSocial(topic);
    setSocialModalOpen(true);
  };

  const approveMutation = trpc.topics.approve.useMutation({
    onMutate: async ({ id }) => {
      await utils.topics.list.cancel();
      const prev = utils.topics.list.getData(queryInput);
      utils.topics.list.setData(
        queryInput,
        (old) => old?.map((t) => (t.id === id ? { ...t, status: "approved" as const } : t))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      utils.topics.list.setData(queryInput, ctx?.prev);
      toast.error("Failed to approve topic");
    },
    onSuccess: () => {
      toast.success("Topic approved");
      utils.topics.list.invalidate();
    },
  });

  const removeMutation = trpc.topics.remove.useMutation({
    onMutate: async ({ id }) => {
      await utils.topics.list.cancel();
      const prev = utils.topics.list.getData(queryInput);
      // Optimistically remove the topic from the visible list immediately
      utils.topics.list.setData(
        queryInput,
        (old) => old?.filter((t) => t.id !== id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      utils.topics.list.setData(queryInput, ctx?.prev);
      toast.error("Failed to remove topic");
    },
    onSuccess: () => {
      toast.success("Topic removed — won't be re-added for 3 months");
      utils.topics.list.invalidate();
    },
  });

  const updatePublishedMutation = trpc.topics.updatePublished.useMutation({
    onSuccess: () => utils.topics.list.invalidate(),
    onError: () => toast.error("Failed to update published status"),
  });

  const categories = useMemo(() => {
    const cats = Array.from(new Set(topics.map((t) => t.category))).sort();
    return cats;
  }, [topics]);

  const filtered = useMemo(() => {
    let result = [...topics];
    if (categoryFilter !== "all") result = result.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.topic.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.keywords as string[]).some((k) => k.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "score") cmp = a.score - b.score;
      else if (sortField === "category") cmp = a.category.localeCompare(b.category);
      else if (sortField === "createdAt")
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [topics, categoryFilter, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-muted-foreground" />;
    return sortDir === "desc" ? (
      <ArrowDown size={12} className="text-primary" />
    ) : (
      <ArrowUp size={12} className="text-primary" />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search topics or keywords…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-card border-border"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-sm bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="removed">Removed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-52 text-sm bg-card border-border">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} topic{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-auto max-w-full">
        {/* Header */}
        <div className="grid grid-cols-[2fr_0.6fr_80px_100px_80px_80px_80px] gap-0 bg-muted/30 border-b border-border min-w-full">
          {[
            { label: "Topic", field: "score" as SortField, colSpan: "" },
            { label: "Category", field: "category" as SortField },
            { label: "Score", field: "score" as SortField },
            { label: "Status", field: null },
            { label: "Blog", field: null },
            { label: "Social", field: null },
            { label: "Actions", field: null },
          ].map(({ label, field }, i) => (
            <div
              key={i}
              className={`px-3 py-2.5 text-sm font-medium text-muted-foreground ${
                field ? "cursor-pointer hover:text-foreground select-none" : ""
              } flex items-center gap-1`}
              onClick={() => field && toggleSort(field)}
            >
              {label}
              {field && <SortIcon field={field} />}
            </div>
          ))}
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading topics…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Filter size={24} className="opacity-40" />
            <p className="text-sm">No topics found</p>
            <p className="text-xs opacity-60">Run the agent to generate topic recommendations</p>
          </div>
        ) : (
          filtered.map((topic, idx) => {
            const statusCfg = STATUS_CONFIG[topic.status];
            const keywords = topic.keywords as string[];
            const brief = topic.brief as string[];
            return (
              <div
                key={topic.id}
                className={`grid grid-cols-[2fr_0.6fr_80px_100px_80px_80px_80px] gap-0 border-b border-border last:border-0 hover:bg-muted/20 transition-colors group ${
                  topic.sourceNews && topic.sourceNews.length > 0 ? "bg-orange-50/50" : ""
                }`}
              >
                {/* Topic + keywords + brief */}
                <div className="px-3 py-3 min-w-0">
                  <p className="text-base font-medium text-foreground leading-snug line-clamp-2">
                    {topic.topic}
                  </p>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {keywords.slice(0, 3).map((kw, i) => (
                        <span
                          key={i}
                          className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary/80 font-mono"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  {brief.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {brief.slice(0, 2).map((b, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                          <span className="text-primary/60 shrink-0">•</span>
                          <span className="line-clamp-1">{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Source news items */}
                  {(() => {
                    const news = (topic as any).sourceNews as { title: string; publication: string; publishedDate: string; url: string }[] | undefined;
                    if (!news || news.length === 0) return null;
                    return (
                      <div className="mt-2 space-y-1">
                        {news.map((n, i) => (
                          <div key={i} className="rounded border border-border/50 bg-muted/20 px-2 py-1.5 flex items-start gap-2">
                            <Newspaper size={10} className="shrink-0 text-primary/40 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-semibold text-primary/70">{n.publication}</span>
                                <span className="text-muted-foreground/40 text-[10px]">·</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{n.publishedDate}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-0.5">{n.title}</p>
                            </div>
                            {n.url && (
                              <a
                                href={n.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors border border-primary/20 hover:border-primary/40 rounded px-1.5 py-0.5 bg-primary/5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={8} />
                                Read
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Category */}
                <div className="px-3 py-3 flex items-start">
                  <span className="text-xs text-muted-foreground leading-snug">{topic.category}</span>
                </div>

                {/* Score */}
                <div className="px-3 py-3 flex items-center">
                  <ScoreBar score={topic.score} />
                </div>

                {/* Status */}
                <div className="px-3 py-3 flex items-center">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusCfg.className}`}
                  >
                    {statusCfg.label}
                  </span>
                </div>

                {/* Blog published */}
                <div className="px-3 py-3 flex items-center justify-center">
                  <Checkbox
                    checked={topic.publishedBlog}
                    onCheckedChange={(checked) =>
                      updatePublishedMutation.mutate({
                        id: topic.id,
                        field: "publishedBlog",
                        value: !!checked,
                      })
                    }
                    disabled={topic.status === "removed"}
                    className="border-border data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                </div>

                {/* Social published */}
                <div className="px-3 py-3 flex items-center justify-center">
                  <Checkbox
                    checked={topic.publishedSocial}
                    onCheckedChange={(checked) =>
                      updatePublishedMutation.mutate({
                        id: topic.id,
                        field: "publishedSocial",
                        value: !!checked,
                      })
                    }
                    disabled={topic.status === "removed"}
                    className="border-border data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="px-3 py-3 flex items-center gap-1">
                  {topic.status !== "removed" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      onClick={() => handlePostToSocial(topic)}
                      title="Post to Social"
                    >
                      <Share2 size={13} />
                    </Button>
                  )}
                  {topic.status !== "approved" && topic.status !== "removed" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      onClick={() => approveMutation.mutate({ id: topic.id })}
                      disabled={approveMutation.isPending}
                      title="Approve"
                    >
                      <CheckCircle2 size={13} />
                    </Button>
                  )}
                  {topic.status !== "removed" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => removeMutation.mutate({ id: topic.id })}
                      disabled={removeMutation.isPending}
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Social Scheduler Modal */}
      {selectedTopicForSocial && (
        <SocialSchedulerModal
          isOpen={socialModalOpen}
          onClose={() => {
            setSocialModalOpen(false);
            setSelectedTopicForSocial(null);
          }}
          topic={selectedTopicForSocial}
        />
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/30" />
          <span>Blog published</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-500/30" />
          <span>Social published</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-green-500 rounded-full" />
          </div>
          <span>Score (0–100)</span>
        </div>
      </div>
    </div>
  );
}
