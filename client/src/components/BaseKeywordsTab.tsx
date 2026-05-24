import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";

const DEFAULT_KEYWORDS = [
  "Construction finance Australia",
  "Development finance Melbourne",
  "Non-bank construction loan",
  "Property development loan",
  "Construction lending Australia",
  "Senior debt finance",
  "Mezzanine finance Australia",
  "Preferred equity finance",
  "Bridging loan commercial",
  "First mortgage loan",
  "Second mortgage finance",
  "Interest-only construction loan",
  "Private credit Australia",
  "Property debt fund",
  "Wholesale investor Australia",
  "Secured private credit",
  "Property income fund",
  "Real estate debt investment",
  "Passive income property investment",
  "Non-bank lender Australia",
  "Alternative lender commercial",
  "Boutique lender Melbourne",
  "Private mortgage lender",
  "Non-conforming commercial loan",
  "Commercial refinance Australia",
  "Self-employed property loan",
  "Non-standard income mortgage",
  "Commercial real estate finance Australia",
  "RBA interest rate property impact",
  "Real estate investment strategy Australia",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
];

export default function BaseKeywordsTab() {
  const { data: savedKeywords, isLoading } = trpc.baseKeywords.list.useQuery();
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (savedKeywords && savedKeywords.length > 0) {
      const filled = savedKeywords.map((k) => k.keyword);
      // Pad to 40
      while (filled.length < 40) filled.push("");
      setKeywords(filled.slice(0, 40));
      setIsDirty(false);
    }
  }, [savedKeywords]);

  const saveMutation = trpc.baseKeywords.save.useMutation({
    onSuccess: () => {
      toast.success("Keywords saved", {
        description: "The agent will use these keywords on the next run.",
      });
      setIsDirty(false);
    },
    onError: (err) => {
      toast.error("Failed to save keywords", { description: err.message });
    },
  });

  function handleChange(index: number, value: string) {
    setKeywords((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setIsDirty(true);
  }

  function handleSave() {
    const nonEmpty = keywords.filter((k) => k.trim());
    saveMutation.mutate({ keywords: nonEmpty });
  }

  const filledCount = keywords.filter((k) => k.trim()).length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            These keywords define the scope of the daily AI agent. The agent uses them to research
            news, generate topic recommendations, and analyse content gaps. Adjust them to steer
            content in a different direction.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {filledCount} of 40 keywords configured
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending || !isDirty}
          className="gap-2 shrink-0"
          size="sm"
        >
          {saveMutation.isPending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          Save Keywords
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading keywords…</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {keywords.map((kw, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/40 font-mono w-5 text-right shrink-0">
                {i + 1}
              </span>
              <Input
                value={kw}
                onChange={(e) => handleChange(i, e.target.value)}
                placeholder={`Keyword ${i + 1}`}
                className="h-8 text-sm bg-card border-border focus:border-primary/50"
              />
            </div>
          ))}
        </div>
      )}

      {isDirty && (
        <div className="flex items-center gap-2 text-xs text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-2">
          <BookOpen size={12} />
          <span>You have unsaved changes. Click "Save Keywords" to apply.</span>
        </div>
      )}
    </div>
  );
}
