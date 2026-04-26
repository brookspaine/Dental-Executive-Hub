import { useMemo, useState } from "react";
import {
  Info,
  Search,
  SlidersHorizontal,
  Bell,
  Plus,
  Star,
  FileText,
  ChevronRight,
  ArrowUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

type ActionItem = {
  id: string;
  title: string;
  owner: { name: string; initials: string };
  source: string;
  dueBy: string;
  starred?: boolean;
  done?: boolean;
};

const sampleItems: ActionItem[] = [
  {
    id: "1",
    title: "Check out the Leadership Team Meeting tool.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
  },
  {
    id: "2",
    title: "Decide the details for your strategy meeting.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
  },
  {
    id: "3",
    title: "Strategy Meeting Prep: Plan your talking points.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
  },
  {
    id: "4",
    title: "Strategy Meeting Prep: Review your numbers.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
  },
  {
    id: "5",
    title: "Invite Your Team to Elite.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
  },
  {
    id: "6",
    title: "Host the Annual Strategy meeting.",
    owner: { name: "Brooks Paine", initials: "BP" },
    source: "Setup Journey",
    dueBy: "Apr 23",
  },
];

export function ActionItems() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ActionItem[]>(sampleItems);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.owner.name.toLowerCase().includes(q) ||
        i.source.toLowerCase().includes(q),
    );
  }, [items, search]);

  const toggleDone = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)),
    );
  };

  const toggleStar = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, starred: !i.starred } : i)),
    );
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Action Items</h2>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notification Preferences</span>
            <span className="sm:hidden">Notifications</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            New Action Item
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search All Action Items"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[60px]"></TableHead>
              <TableHead>Action Item</TableHead>
              <TableHead className="w-[180px]">
                <span className="inline-flex items-center gap-1">
                  Owner <ArrowUp className="h-3 w-3" />
                </span>
              </TableHead>
              <TableHead className="w-[140px]">Source</TableHead>
              <TableHead className="w-[110px]">
                <span className="inline-flex items-center gap-1">
                  Due By <ArrowUp className="h-3 w-3" />
                </span>
              </TableHead>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-sm text-muted-foreground py-10"
                >
                  No action items match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item, idx) => (
                <TableRow key={item.id} className="group">
                  <TableCell className="pl-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStar(item.id)}
                        aria-label={
                          item.starred ? "Unstar item" : "Star item"
                        }
                        className="text-muted-foreground hover:text-amber-500 transition-colors"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            item.starred
                              ? "fill-amber-400 text-amber-500"
                              : ""
                          }`}
                        />
                      </button>
                      <Checkbox
                        checked={!!item.done}
                        onCheckedChange={() => toggleDone(item.id)}
                        aria-label={`Mark item ${idx + 1} complete`}
                      />
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-sm ${
                      item.done ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {idx + 1}. {item.title}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-pink-500 text-white text-xs font-semibold">
                          {item.owner.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{item.owner.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{item.source}</TableCell>
                  <TableCell className="text-sm font-medium text-rose-500">
                    {item.dueBy}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      aria-label="View notes"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      aria-label="Open action item"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
