import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import {
  useListDirectReports,
  useCreateDirectReport,
  type DirectReport,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type TeamMember = DirectReport;

export interface MemberPickerProps {
  value: number | null;
  onChange: (id: number | null, member: TeamMember | null) => void;
  /**
   * When true the picker offers an "Open / Unassigned" sentinel that maps
   * back to a `null` value. Useful for nullable seats and optional
   * action-item assignees.
   */
  allowUnassigned?: boolean;
  /**
   * When true the picker offers an inline "Add team member…" entry that
   * opens a small dialog and POSTs to the team_members API. The newly
   * created member is auto-selected on success.
   */
  allowCreate?: boolean;
  /**
   * Default org id passed into the create form, so a seat created from a
   * role page lands in the same location as the role itself. Optional.
   */
  defaultOrganizationId?: number | null;
  placeholder?: string;
  /** Disables the trigger; the popover stays closed. */
  disabled?: boolean;
  /** Force a className on the trigger button. */
  className?: string;
}

/**
 * Single, shared people picker used wherever a user is named on a thing.
 *
 * It reads from the `useListDirectReports` query so every instance shares
 * the same react-query cache: opening a picker on the action-item page
 * after editing a name on the members page sees the new label without an
 * extra network round trip.
 */
export function MemberPicker({
  value,
  onChange,
  allowUnassigned,
  allowCreate,
  defaultOrganizationId = null,
  placeholder = "Select a team member…",
  disabled,
  className,
}: MemberPickerProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { data: members, isLoading } = useListDirectReports();

  const selected = useMemo(
    () => members?.find((m) => m.id === value) ?? null,
    [members, value],
  );

  const triggerLabel = selected
    ? selected.name
    : value === null && allowUnassigned
      ? "Open / Unassigned"
      : placeholder;

  function handleSelect(member: TeamMember): void {
    onChange(member.id, member);
    setOpen(false);
  }

  function handleClear(): void {
    onChange(null, null);
    setOpen(false);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search team members…" className="h-9" />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading…" : "No team members found."}
              </CommandEmpty>
              {allowUnassigned ? (
                <CommandGroup>
                  <CommandItem
                    value="__unassigned__"
                    onSelect={handleClear}
                    className="text-muted-foreground"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === null ? "opacity-100" : "opacity-0",
                      )}
                    />
                    Open / Unassigned
                  </CommandItem>
                </CommandGroup>
              ) : null}
              <CommandGroup heading="Team members">
                {(members ?? []).map((m) => (
                  <CommandItem
                    key={m.id}
                    /* The value is what CommandInput searches against. */
                    value={`${m.name} ${m.role} ${m.email}`}
                    onSelect={() => handleSelect(m)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === m.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{m.name}</span>
                      {m.role ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {m.role}
                        </span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              {allowCreate ? (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      value="__add_team_member__"
                      onSelect={() => {
                        setOpen(false);
                        setCreateOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add team member…
                    </CommandItem>
                  </CommandGroup>
                </>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {allowCreate ? (
        <CreateMemberDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultOrganizationId={defaultOrganizationId}
          onCreated={(member) => {
            onChange(member.id, member);
            setCreateOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOrganizationId: number | null;
  onCreated: (member: TeamMember) => void;
}

function CreateMemberDialog({
  open,
  onOpenChange,
  defaultOrganizationId,
  onCreated,
}: CreateMemberDialogProps): React.ReactElement {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreateDirectReport();

  function reset(): void {
    setName("");
    setRole("");
    setEmail("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedRole = role.trim() || "Team Member";
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    try {
      const created = await create.mutateAsync({
        data: {
          name: trimmedName,
          role: trimmedRole,
          email: trimmedEmail,
          ...(defaultOrganizationId !== null
            ? { organizationId: defaultOrganizationId }
            : {}),
        },
      });
      reset();
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
          <DialogDescription>
            Creates a new person you can assign to seats, action items, and
            meetings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="member-picker-name">Name</Label>
            <Input
              id="member-picker-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Chen"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-picker-role">Role</Label>
            <Input
              id="member-picker-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Lead Dentist"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-picker-email">Email</Label>
            <Input
              id="member-picker-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alex@edge.dental"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                "Add member"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
