import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Copy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function MyTopicsTab() {
  const { data: allTopics = [], refetch } = trpc.userTopics.list.useQuery();
  const deleteMutation = trpc.userTopics.delete.useMutation();
  const clearMutation = trpc.userTopics.clear.useMutation();

  const socialTopics = useMemo(() => allTopics.filter((t) => t.topicType === "social"), [allTopics]);
  const articleTopics = useMemo(() => allTopics.filter((t) => t.topicType === "article"), [allTopics]);

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      await refetch();
      toast.success("Topic removed");
    } catch (error) {
      toast.error("Failed to delete topic");
    }
  };

  const handleClear = async (topicType: "social" | "article") => {
    if (!confirm(`Clear all ${topicType} topics?`)) return;
    try {
      await clearMutation.mutateAsync({ topicType });
      await refetch();
      toast.success(`Cleared all ${topicType} topics`);
    } catch (error) {
      toast.error("Failed to clear topics");
    }
  };

  const handleCopyList = (topics: typeof socialTopics) => {
    const text = topics.map((t) => t.topicTitle).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Social Topics Column */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Social Media Topics ({socialTopics.length})</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyList(socialTopics)}
              disabled={socialTopics.length === 0}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleClear("social")}
              disabled={socialTopics.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {socialTopics.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No social topics yet</p>
          ) : (
            socialTopics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 group"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{topic.topicTitle}</p>
                  {topic.newsSourceTitle && (
                    <p className="text-xs text-muted-foreground">From: {topic.newsSourceTitle}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(topic.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Article Topics Column */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Blog Article Topics ({articleTopics.length})</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyList(articleTopics)}
              disabled={articleTopics.length === 0}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleClear("article")}
              disabled={articleTopics.length === 0}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {articleTopics.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No article topics yet</p>
          ) : (
            articleTopics.map((topic) => (
              <div
                key={topic.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 group"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{topic.topicTitle}</p>
                  {topic.newsSourceTitle && (
                    <p className="text-xs text-muted-foreground">From: {topic.newsSourceTitle}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(topic.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
