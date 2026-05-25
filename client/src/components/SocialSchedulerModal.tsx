import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

interface SocialSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: { id: number; topic: string; keywords: string[]; brief: string[] };
}

export function SocialSchedulerModal({ isOpen, onClose, topic }: SocialSchedulerModalProps) {
  const [captions, setCaptions] = useState<Array<{ caption: string }>>([]);
  const [selectedCaption, setSelectedCaption] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [isLoadingCaptions, setIsLoadingCaptions] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const generateCaptionsMutation = trpc.social.generateCaptions.useMutation();
  const getAccountsMutation = trpc.social.getHubSpotAccounts.useQuery();
  const schedulePostMutation = trpc.social.schedulePost.useMutation();

  // Load captions and accounts when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingCaptions(true);
    generateCaptionsMutation.mutate(
      {
        topic: topic.topic,
        keywords: topic.keywords,
        brief: topic.brief,
      },
      {
        onSuccess: (data) => {
          setCaptions(data);
          setIsLoadingCaptions(false);
        },
        onError: () => {
          toast.error("Failed to generate captions");
          setIsLoadingCaptions(false);
        },
      }
    );

    setIsLoadingAccounts(true);
    getAccountsMutation.refetch().then(() => setIsLoadingAccounts(false));
  }, [isOpen]);

  const handleSchedule = async () => {
    if (!selectedCaption || !selectedAccount || !scheduledTime) {
      toast.error("Please select a caption, account, and date/time");
      return;
    }

    schedulePostMutation.mutate(
      {
        accountId: selectedAccount,
        caption: selectedCaption,
        scheduledTime,
      },
      {
        onSuccess: () => {
          toast.success("Post scheduled successfully!");
          onClose();
          setCaptions([]);
          setSelectedCaption("");
          setSelectedAccount("");
          setScheduledTime("");
        },
        onError: (err) => {
          toast.error(`Failed to schedule post: ${err.message}`);
        },
      }
    );
  };

  const accounts = getAccountsMutation.data || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Social Post: {topic.topic}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Captions */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Caption</label>
            {isLoadingCaptions ? (
              <div className="flex items-center justify-center py-4">
                <Spinner className="w-4 h-4 mr-2" />
                Generating captions...
              </div>
            ) : captions.length > 0 ? (
              <div className="space-y-2">
                {captions.map((item, idx) => (
                  <label key={idx} className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="caption"
                      value={item.caption}
                      checked={selectedCaption === item.caption}
                      onChange={(e) => setSelectedCaption(e.target.value)}
                      className="mt-1 mr-3"
                    />
                    <span className="text-sm">{item.caption}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No captions available</p>
            )}
          </div>

          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">HubSpot Social Account</label>
            {isLoadingAccounts ? (
              <div className="flex items-center justify-center py-2">
                <Spinner className="w-4 h-4 mr-2" />
                Loading accounts...
              </div>
            ) : accounts.length > 0 ? (
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">No HubSpot social accounts found</p>
            )}
          </div>

          {/* Date/Time Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">Schedule Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!selectedCaption || !selectedAccount || !scheduledTime || schedulePostMutation.isPending}
            >
              {schedulePostMutation.isPending ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Scheduling...
                </>
              ) : (
                "Schedule Post"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
