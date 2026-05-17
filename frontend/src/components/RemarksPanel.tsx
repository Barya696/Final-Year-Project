import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Remark {
  id: string;
  date: string;
  author: string;
  content: string;
  relatedCourse?: string;
}

interface RemarksPanelProps {
  remarks: Remark[];
  onAddRemark: (content: string) => void;
}

const RemarksPanel = ({ remarks, onAddRemark }: RemarksPanelProps) => {
  const [newRemark, setNewRemark] = useState("");

  const handleSubmit = () => {
    if (newRemark.trim()) {
      onAddRemark(newRemark.trim());
      setNewRemark("");
    }
  };

  return (
    <div className="bg-card border border-border rounded">
      <div className="px-4 py-3 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Administrative Remarks</h3>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Add new remark */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Add Remark
          </label>
          <Textarea
            value={newRemark}
            onChange={(e) => setNewRemark(e.target.value)}
            placeholder="Enter administrative comment or observation..."
            className="min-h-[80px] text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!newRemark.trim()}
              size="sm"
              className="h-8"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Submit Remark
            </Button>
          </div>
        </div>

        {/* Existing remarks */}
        {remarks.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Previous Remarks
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {remarks.map((remark) => (
                <div
                  key={remark.id}
                  className="p-3 bg-muted/50 rounded text-sm space-y-1"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{remark.author}</span>
                    <span>{remark.date}</span>
                  </div>
                  <p className="text-foreground">{remark.content}</p>
                  {remark.relatedCourse && (
                    <p className="text-xs text-muted-foreground">
                      Related to: {remark.relatedCourse}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RemarksPanel;
