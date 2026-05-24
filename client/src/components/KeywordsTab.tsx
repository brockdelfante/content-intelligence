import { Badge } from "@/components/ui/badge";
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
  Key,
  Loader2,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";

type SortField = "estimatedVolume" | "difficulty" | "cpcAud" | "keyword";
type SortDir = "asc" | "desc";

const INTENT_CONFIG = {
  informational: {
    label: "Informational",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  navigational: {
    label: "Navigational",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  commercial: {
    label: "Commercial",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  transactional: {
    label: "Transactional",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
  },
};

function DifficultyBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? "bg-red-500" : pct >= 40 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-6 text-right">{pct}</span>
    </div>
  );
}

function VolumeDisplay({ value }: { value: number }) {
  const formatted =
    value >= 10000
      ? `${(value / 1000).toFixed(0)}k`
      : value >= 1000
      ? `${(value / 1000).toFixed(1)}k`
      : value.toString();
  return <span className="text-xs font-mono text-foreground">{formatted}</span>;
}

export default function KeywordsTab() {
  const { data: keywords = [], isLoading } = trpc.keywords.list.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const [search, setSearch] = useState("");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("estimatedVolume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    let result = [...keywords];
    if (intentFilter !== "all") result = result.filter((k) => k.searchIntent === intentFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((k) => k.keyword.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "estimatedVolume") cmp = a.estimatedVolume - b.estimatedVolume;
      else if (sortField === "difficulty") cmp = a.difficulty - b.difficulty;
      else if (sortField === "cpcAud") cmp = (a.cpcAud ?? 0) - (b.cpcAud ?? 0);
      else if (sortField === "keyword") cmp = a.keyword.localeCompare(b.keyword);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [keywords, intentFilter, search, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={11} className="text-muted-foreground" />;
    return sortDir === "desc" ? (
      <ArrowDown size={11} className="text-primary" />
    ) : (
      <ArrowUp size={11} className="text-primary" />
    );
  }

  // Summary stats
  const totalKeywords = keywords.length;
  const avgDifficulty = keywords.length
    ? Math.round(keywords.reduce((s, k) => s + k.difficulty, 0) / keywords.length)
    : 0;
  const trendingCount = keywords.filter((k) => k.trending).length;
  const baseCount = keywords.filter((k) => k.isBase).length;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Keywords", value: totalKeywords, icon: <Key size={13} /> },
          { label: "Avg. Difficulty", value: `${avgDifficulty}/100`, icon: <ArrowUpDown size={13} /> },
          { label: "Trending", value: trendingCount, icon: <TrendingUp size={13} /> },
          { label: "Base Keywords", value: baseCount, icon: <Key size={13} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              {icon}
              <span className="text-[11px]">{label}</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search keywords…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-card border-border"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>
        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="h-8 w-44 text-sm bg-card border-border">
            <SelectValue placeholder="Search intent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All intents</SelectItem>
            <SelectItem value="informational">Informational</SelectItem>
            <SelectItem value="navigational">Navigational</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="transactional">Transactional</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} keyword{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="grid grid-cols-[2fr_120px_100px_100px_80px_1fr] bg-muted/30 border-b border-border">
          {[
            { label: "Keyword", field: "keyword" as SortField },
            { label: "Intent", field: null },
            { label: "Volume/mo", field: "estimatedVolume" as SortField },
            { label: "Difficulty", field: "difficulty" as SortField },
            { label: "CPC (AUD)", field: "cpcAud" as SortField },
            { label: "Related Topics", field: null },
          ].map(({ label, field }, i) => (
            <div
              key={i}
              className={`px-3 py-2.5 text-xs font-medium text-muted-foreground flex items-center gap-1 ${
                field ? "cursor-pointer hover:text-foreground select-none" : ""
              }`}
              onClick={() => field && toggleSort(field)}
            >
              {label}
              {field && <SortIcon field={field} />}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading keywords…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Key size={24} className="opacity-40" />
            <p className="text-sm">No keywords found</p>
            <p className="text-xs opacity-60">Run the agent to populate keyword data</p>
          </div>
        ) : (
          filtered.map((kw) => {
            const intentCfg = INTENT_CONFIG[kw.searchIntent];
            const relatedTopics = kw.relatedTopics as string[];
            return (
              <div
                key={kw.id}
                className="grid grid-cols-[2fr_120px_100px_100px_80px_1fr] border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
              >
                <div className="px-3 py-2.5 flex items-center gap-2">
                  <span className="text-sm text-foreground font-medium">{kw.keyword}</span>
                  {kw.trending && (
                    <TrendingUp size={11} className="text-orange-400 shrink-0" />
                  )}
                  {kw.isBase && (
                    <span className="text-[9px] px-1 py-0 rounded bg-primary/15 text-primary/80 font-medium">
                      BASE
                    </span>
                  )}
                </div>
                <div className="px-3 py-2.5 flex items-center">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${intentCfg.className}`}
                  >
                    {intentCfg.label}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-center">
                  <VolumeDisplay value={kw.estimatedVolume} />
                </div>
                <div className="px-3 py-2.5 flex items-center">
                  <DifficultyBar value={kw.difficulty} />
                </div>
                <div className="px-3 py-2.5 flex items-center">
                  <span className="text-xs font-mono text-muted-foreground">
                    ${(kw.cpcAud ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="px-3 py-2.5 flex items-center flex-wrap gap-1">
                  {relatedTopics.slice(0, 3).map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
