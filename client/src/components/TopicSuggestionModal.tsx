import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TopicSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newsTitle: string;
  newsContent: string;
  topicType: "social" | "article";
}

export function TopicSuggestionModal({
  open,
  onOpenChange,
  newsTitle,
  newsContent,
  topicType,
}: TopicSuggestionModalProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const generateMutation = trpc.userTopics.generateSuggestions.useMutation();
  const saveMutation = trpc.userTopics.save.useMutation();

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    try {
      const result = await generateMutation.mutateAsync({
        newsTitle,
        newsContent,
        topicType,
      });
      setSuggestions(result || []);
      setSelected(new Set());
    } catch (error) {
      toast.error("Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuggestion = (suggestion: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(suggestion)) {
      newSelected.delete(suggestion);
    } else {
      newSelected.add(suggestion);
    }
    setSelected(newSelected);
  };

  const handleAddToList = async () => {
    try {
      const selectedArray = Array.from(selected);
      for (const topic of selectedArray) {
        await saveMutation.mutateAsync({
          topicType,
          topicTitle: topic,
          newsSourceTitle: newsTitle,
        });
      }
      toast.success(`Added ${selectedArray.length} topic(s) to My Topics`);
      setSelected(new Set());
      setSuggestions([]);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save topics");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {topicType === "social" ? "Social Media Post Topics" : "Blog Article Topics"}
          </DialogTitle>
          <DialogDescription>
            Generated from: {newsTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No suggestions generated yet</p>
              <Button onClick={handleGenerateSuggestions} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Suggestions
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {suggestions.map((suggestion, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                    <Checkbox
                      checked={selected.has(suggestion)}
                      onCheckedChange={() => handleToggleSuggestion(suggestion)}
                    />
                    <span className="flex-1 text-sm">{suggestion}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-between">
                <Button
                  variant="outline"
                  onClick={handleGenerateSuggestions}
                  disabled={loading}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddToList}
                    disabled={selected.size === 0 || saveMutation.isPending}
                  >
                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add {selected.size > 0 ? `(${selected.size})` : ""} to My Topics
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
