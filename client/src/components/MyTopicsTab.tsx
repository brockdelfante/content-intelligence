import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "../lib/trpc";

export function MyTopicsTab() {
  const utils = trpc.useUtils();
  const { data: allTopics = [], isLoading } = trpc.userTopics.list.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const deleteMutation = trpc.userTopics.delete.useMutation({
    onSuccess: () => {
      utils.userTopics.list.invalidate();
      toast.success("Topic removed");
    },
    onError: () => toast.error("Failed to remove topic"),
  });

  const clearMutation = trpc.userTopics.clear.useMutation({
    onSuccess: () => {
      utils.userTopics.list.invalidate();
      toast.success("All topics cleared");
    },
    onError: () => toast.error("Failed to clear topics"),
  });

  const { socialTopics, articleTopics } = useMemo(() => {
    return {
      socialTopics: allTopics.filter((t) => t.topicType === "social"),
      articleTopics: allTopics.filter((t) => t.topicType === "article"),
    };
  }, [allTopics]);

  const handleCopy = (topics: typeof allTopics) => {
    const text = topics.map((t) => t.topicTitle).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handleClear = (topicType: "social" | "article") => {
    if (confirm(`Clear all ${topicType} topics? This cannot be undone.`)) {
      clearMutation.mutate({ topicType });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading topics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-6">
        {/* Social Topics Column */}
        <Card className="p-0 overflow-hidden flex flex-col">
          <div className="bg-muted/50 border-b border-border p-4 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Social Topics ({socialTopics.length})</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1.5"
                onClick={() => handleCopy(socialTopics)}
                disabled={socialTopics.length === 0}
              >
                <Copy size={13} />
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => handleClear("social")}
                disabled={socialTopics.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-border">
            {socialTopics.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No social topics yet. Click "Social Post" on a topic in the queue to add one.
              </div>
            ) : (
              socialTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-3 hover:bg-muted/30 flex items-start justify-between gap-2 group transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground break-words">{topic.topicTitle}</p>
                    {topic.newsSourceTitle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {topic.newsSourceTitle}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(topic.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Article Topics Column */}
        <Card className="p-0 overflow-hidden flex flex-col">
          <div className="bg-muted/50 border-b border-border p-4 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Article Topics ({articleTopics.length})</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1.5"
                onClick={() => handleCopy(articleTopics)}
                disabled={articleTopics.length === 0}
              >
                <Copy size={13} />
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => handleClear("article")}
                disabled={articleTopics.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-border">
            {articleTopics.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No article topics yet. Click "Article Post" on a topic in the queue to add one.
              </div>
            ) : (
              articleTopics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-3 hover:bg-muted/30 flex items-start justify-between gap-2 group transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground break-words">{topic.topicTitle}</p>
                    {topic.newsSourceTitle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {topic.newsSourceTitle}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(topic.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
