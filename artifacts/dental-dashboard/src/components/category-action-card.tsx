import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useActionItems } from "@/contexts/action-items-context";

type CategoryActionCardProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  scopeId?: string;
};

function getSourceKey(title: string, scopeId?: string) {
  return scopeId ? `${scopeId}::${title}` : title;
}

export function CategoryActionCard({
  title,
  icon: Icon,
  scopeId,
}: CategoryActionCardProps) {
  const { items, addItem, toggleDone, removeItem } = useActionItems();
  const [expanded, setExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const sourceKey = getSourceKey(title, scopeId);
  const categoryItems = items.filter((i) => i.source === sourceKey);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addItem({ title: newTitle, source: sourceKey });
    setNewTitle("");
  };

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
        aria-expanded={expanded}
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="font-semibold flex-1">{title}</div>
        {categoryItems.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {categoryItems.length}
          </span>
        )}
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3">
          {categoryItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No action items yet. Add one below.
            </p>
          ) : (
            <ul className="space-y-2">
              {categoryItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 group py-1"
                >
                  <Checkbox
                    checked={!!item.done}
                    onCheckedChange={() => toggleDone(item.id)}
                  />
                  <span
                    className={`text-sm flex-1 ${
                      item.done
                        ? "line-through text-muted-foreground"
                        : ""
                    }`}
                  >
                    {item.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove action item"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
            className="flex items-center gap-2 pt-1"
          >
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={`Add ${title.toLowerCase()} action item…`}
              className="h-9"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newTitle.trim()}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}
