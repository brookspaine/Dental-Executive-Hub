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
  Pencil,
  ChevronDown,
  CalendarDays,
  Phone,
  Mail,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ExternalLink } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { useActionItems } from "@/contexts/action-items-context";
import type { ActionItem } from "@/contexts/action-items-context";

export function ActionItems() {
  const {
    items,
    setItems,
    addItem,
    toggleDone,
    toggleStar,
    removeItem,
  } = useActionItems();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    dueDate: string;
    notes: string;
    dailyTop3: boolean;
  }>({ title: "", dueDate: "", notes: "", dailyTop3: false });
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    textUpcoming: false,
    textDailyPriority: false,
    emailUpcoming: true,
  });
  const [newOpen, setNewOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const defaultFilters = {
    source: "all",
    status: "uncompleted",
    owner: "all",
    dueDate: "all",
  };
  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) set.add(i.source);
    return Array.from(set).sort();
  }, [items]);

  const filterLabel = (key: keyof typeof defaultFilters, value: string) => {
    const map: Record<string, Record<string, string>> = {
      source: {
        all: "All",
        ...Object.fromEntries(sourceOptions.map((s) => [s, s])),
      },
      status: {
        all: "All",
        uncompleted: "Uncompleted",
        completed: "Completed",
      },
      owner: { all: "All", me: "Brooks Paine" },
      dueDate: {
        all: "All",
        overdue: "Overdue",
        today: "Today",
        week: "This Week",
      },
    };
    return map[key]?.[value] ?? value;
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };
  const [newForm, setNewForm] = useState({
    title: "",
    context: "none",
    dueDate: "",
    notes: "",
    dailyTop3: false,
  });

  const resetNewForm = () =>
    setNewForm({
      title: "",
      context: "none",
      dueDate: "",
      notes: "",
      dailyTop3: false,
    });

  const saveNewItem = () => {
    if (!newForm.title.trim()) return;
    addItem({
      title: newForm.title,
      source: newForm.context === "none" ? "Manual" : newForm.context,
      dueDate: newForm.dueDate,
      notes: newForm.notes,
    });
    setNewOpen(false);
    resetNewForm();
  };

  const openItem = items.find((i) => i.id === openId) ?? null;
  const openItemIndex = openItem
    ? items.findIndex((i) => i.id === openItem.id)
    : -1;
  const editItem = items.find((i) => i.id === editId) ?? null;

  const startEdit = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setEditForm({
      title: item.title,
      dueDate: item.dueByFull,
      notes: (item.notes ?? []).map((n) => n.label).join("\n"),
      dailyTop3: false,
    });
    setEditId(id);
  };

  const saveEdit = () => {
    if (!editId) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === editId
          ? {
              ...i,
              title: editForm.title,
              dueByFull: editForm.dueDate,
              notes: editForm.notes
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((label) => ({ label })),
            }
          : i,
      ),
    );
    setEditId(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (
        q &&
        !(
          i.title.toLowerCase().includes(q) ||
          i.owner.name.toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      if (
        appliedFilters.source !== "all" &&
        i.source !== appliedFilters.source
      ) {
        return false;
      }
      if (appliedFilters.status === "uncompleted" && i.done) return false;
      if (appliedFilters.status === "completed" && !i.done) return false;
      return true;
    });
  }, [items, search, appliedFilters]);


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
            onClick={() => setNotifOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notification Preferences</span>
            <span className="sm:hidden">Notifications</span>
          </button>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
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
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <div className="px-4 py-3 flex items-center justify-between border-b">
                <h4 className="text-sm font-semibold">Filter By</h4>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Reset
                </button>
              </div>
              <div className="py-1">
                {(
                  [
                    {
                      key: "source",
                      label: "Source",
                      options: [
                        { value: "all", label: "All" },
                        ...sourceOptions.map((s) => ({ value: s, label: s })),
                      ],
                    },
                    {
                      key: "status",
                      label: "Status",
                      options: [
                        { value: "all", label: "All" },
                        { value: "uncompleted", label: "Uncompleted" },
                        { value: "completed", label: "Completed" },
                      ],
                    },
                    {
                      key: "owner",
                      label: "Owner",
                      options: [
                        { value: "all", label: "All" },
                        { value: "me", label: "Brooks Paine" },
                      ],
                    },
                    {
                      key: "dueDate",
                      label: "Due Date",
                      options: [
                        { value: "all", label: "All" },
                        { value: "overdue", label: "Overdue" },
                        { value: "today", label: "Today" },
                        { value: "week", label: "This Week" },
                      ],
                    },
                  ] as const
                ).map((row) => (
                  <Select
                    key={row.key}
                    value={filters[row.key]}
                    onValueChange={(v) =>
                      setFilters((prev) => ({ ...prev, [row.key]: v }))
                    }
                  >
                    <SelectTrigger
                      className="h-auto rounded-none border-0 border-b last:border-b-0 px-4 py-2.5 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 [&>svg]:hidden"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="text-left">
                          <div className="text-sm font-semibold">
                            {row.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {filterLabel(row.key, filters[row.key])}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {row.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </div>
              <div className="px-4 py-3 border-t flex items-center justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyFilters}
                  className="border-primary text-primary hover:bg-primary/5"
                >
                  Apply Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>
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
                <TableRow
                  key={item.id}
                  className="group cursor-pointer"
                  onClick={() => setOpenId(item.id)}
                >
                  <TableCell
                    className="pl-3"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label="View notes"
                      onClick={() => setOpenId(item.id)}
                      className={`transition-colors ${
                        item.notes && item.notes.length > 0
                          ? "text-foreground hover:text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Detail slide-over */}
      <Sheet
        open={!!openItem}
        onOpenChange={(open) => !open && setOpenId(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col"
        >
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="text-lg font-semibold">
              Action Item
            </SheetTitle>
            <SheetDescription className="sr-only">
              Action item details
            </SheetDescription>
          </SheetHeader>
          {openItem && (
            <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => startEdit(openItem.id)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  checked={!!openItem.done}
                  onCheckedChange={() => toggleDone(openItem.id)}
                  className="mt-1"
                  aria-label="Mark complete"
                />
                <p
                  className={`text-base leading-snug ${
                    openItem.done
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {openItemIndex + 1}. {openItem.title}
                </p>
              </div>

              <dl className="space-y-2.5 text-sm pl-7">
                <div className="flex items-center gap-2">
                  <dt className="font-semibold">Source:</dt>
                  <dd>{openItem.source}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="font-semibold">Owner:</dt>
                  <dd className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-pink-500 text-white text-xs font-semibold">
                        {openItem.owner.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span>{openItem.owner.name}</span>
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="font-semibold">Due By:</dt>
                  <dd>{openItem.dueByFull}</dd>
                </div>
              </dl>

              <div className="pl-7 space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <FileText className="h-4 w-4" />
                  Notes:
                </div>
                {openItem.notes && openItem.notes.length > 0 ? (
                  <ul className="space-y-1.5">
                    {openItem.notes.map((note, i) => (
                      <li key={i}>
                        {note.href ? (
                          <a
                            href={note.href}
                            className="text-sm text-primary underline hover:no-underline"
                          >
                            {note.label}
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="text-sm text-primary underline hover:no-underline text-left"
                          >
                            {note.label}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No notes yet.
                  </p>
                )}
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  removeItem(openItem.id);
                  setOpenId(null);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive hover:underline"
              >
                <Trash2 className="h-4 w-4" />
                Delete Action Item
              </button>
            </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit slide-over */}
      <Sheet
        open={!!editItem}
        onOpenChange={(open) => !open && setEditId(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col"
        >
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="text-lg font-semibold">
              Action Item
            </SheetTitle>
            <SheetDescription className="sr-only">
              Edit action item
            </SheetDescription>
          </SheetHeader>
          {editItem && (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title" className="text-sm">
                    Action Item
                  </Label>
                  <Input
                    id="edit-title"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className="border-primary focus-visible:ring-primary"
                  />
                </div>

                <p className="text-sm">
                  <span className="font-semibold">Source:</span>{" "}
                  {editItem.source}
                </p>

                <div className="space-y-1.5">
                  <Label className="text-sm">Owner</Label>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-pink-500 text-white text-xs font-semibold">
                          {editItem.owner.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span>{editItem.owner.name} (me)</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-due" className="text-sm">
                    Due Date
                  </Label>
                  <div className="relative">
                    <Input
                      id="edit-due"
                      value={editForm.dueDate}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          dueDate: e.target.value,
                        }))
                      }
                      placeholder="Apr 23, 2026"
                    />
                    <CalendarDays className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-notes" className="text-sm">
                    Notes
                  </Label>
                  <Textarea
                    id="edit-notes"
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={6}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="edit-top3"
                    checked={editForm.dailyTop3}
                    onCheckedChange={(checked) =>
                      setEditForm((f) => ({ ...f, dailyTop3: checked }))
                    }
                  />
                  <Label htmlFor="edit-top3" className="text-sm font-normal">
                    Make this Action Item a Daily Top 3
                  </Label>
                </div>

                <Card className="p-4 space-y-1.5">
                  <h3 className="text-sm font-semibold">
                    Connect your calendar to Elite
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Add intentional time blocks on your calendar to ensure that
                    your action items get done and you make the most of every
                    day. Simply sync your calendar to get started.
                  </p>
                </Card>
              </div>

              <div className="border-t px-6 py-3 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditId(null)}>
                  Cancel
                </Button>
                <Button onClick={saveEdit}>Save</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Notification Preferences slide-over */}
      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 flex flex-col"
        >
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="text-lg font-semibold">
              Notification Preferences
            </SheetTitle>
            <SheetDescription className="sr-only">
              Configure your action item notification preferences
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Text Reminders */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                <h3 className="text-base font-semibold">Text Reminders</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Reminders will be sent to (304) 382-9080.{" "}
                <button
                  type="button"
                  className="text-primary font-medium hover:underline"
                >
                  Edit
                </button>
              </p>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-semibold">
                    Upcoming action items
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    You'll get a reminder two days prior to an Action Item's
                    due date.
                  </p>
                </div>
                <Switch
                  checked={notifPrefs.textUpcoming}
                  onCheckedChange={(v) =>
                    setNotifPrefs((p) => ({ ...p, textUpcoming: v }))
                  }
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-semibold">
                    Daily Priority
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    We'll prompt you to set your daily priorities in the
                    morning and follow up at the end of the day. Don't worry,
                    we won't text you on the weekends.
                  </p>
                </div>
                <Switch
                  checked={notifPrefs.textDailyPriority}
                  onCheckedChange={(v) =>
                    setNotifPrefs((p) => ({ ...p, textDailyPriority: v }))
                  }
                />
              </div>
            </section>

            <div className="border-t" />

            {/* Email Reminders */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <h3 className="text-base font-semibold">Email Reminders</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Reminders will be sent to brookspaine@gmail.com
              </p>

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-semibold">
                    Upcoming Action Items
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    You'll get a reminder two days prior to an Action Item's
                    due date.
                  </p>
                </div>
                <Switch
                  checked={notifPrefs.emailUpcoming}
                  onCheckedChange={(v) =>
                    setNotifPrefs((p) => ({ ...p, emailUpcoming: v }))
                  }
                />
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      {/* New Action Item dialog */}
      <Dialog
        open={newOpen}
        onOpenChange={(open) => {
          setNewOpen(open);
          if (!open) resetNewForm();
        }}
      >
        <DialogContent className="max-w-3xl p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">
              New Action Item
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new action item
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 px-6 py-5">
            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-title" className="text-sm font-semibold">
                  Action Item
                </Label>
                <Input
                  id="new-title"
                  value={newForm.title}
                  onChange={(e) =>
                    setNewForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Enter Action Item Here"
                  autoFocus
                  className="border-primary focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">
                  Context (Optional)
                </Label>
                <Select
                  value={newForm.context}
                  onValueChange={(v) =>
                    setNewForm((f) => ({ ...f, context: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No Context" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Context</SelectItem>
                    <SelectItem value="Setup Journey">Setup Journey</SelectItem>
                    <SelectItem value="Leadership Team">
                      Leadership Team
                    </SelectItem>
                    <SelectItem value="1-on-1">1-on-1</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Owner</Label>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-pink-500 text-white text-xs font-semibold">
                        BP
                      </AvatarFallback>
                    </Avatar>
                    <span>Brooks Paine (me)</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-due" className="text-sm font-semibold">
                  Due Date
                </Label>
                <div className="relative">
                  <Input
                    id="new-due"
                    value={newForm.dueDate}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, dueDate: e.target.value }))
                    }
                    placeholder=""
                  />
                  <CalendarDays className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="new-top3"
                  checked={newForm.dailyTop3}
                  onCheckedChange={(v) =>
                    setNewForm((f) => ({ ...f, dailyTop3: v }))
                  }
                />
                <Label htmlFor="new-top3" className="text-sm font-normal">
                  Make this Action Item a Daily Top 3
                </Label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-notes" className="text-sm font-semibold">
                  Action Item Notes (Optional)
                </Label>
                <Textarea
                  id="new-notes"
                  value={newForm.notes}
                  onChange={(e) =>
                    setNewForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={4}
                  placeholder="Notes about this action item"
                  className="resize-none"
                />
              </div>
            </div>

            {/* Sidebar card */}
            <div>
              <Card className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">
                  Connect your calendar to Elite
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Add intentional time blocks on your calendar to ensure that
                  your action items get done and you make the most of every
                  day.
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Simply sync your calendar to get started.
                </p>
                <Button variant="outline" className="w-full gap-2 mt-1">
                  <ExternalLink className="h-4 w-4" />
                  Sync Calendar
                </Button>
              </Card>
            </div>
          </div>

          <div className="border-t px-6 py-3 flex items-center justify-center">
            <Button
              onClick={saveNewItem}
              disabled={!newForm.title.trim()}
              className="px-8"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
