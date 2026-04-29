import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, BookOpen, Edit3, Eye, Plus, Save, Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPlaybook,
  useUpdatePlaybook,
  useDeletePlaybook,
  useListRoles,
  useListPlaybooks,
  getGetPlaybookQueryKey,
  getListPlaybooksQueryKey,
  type Playbook,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PLAYBOOK_CATEGORIES } from "@/lib/role-styles";

type Mode = "reference" | "edit";

type Step = { id: string; text: string };

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function PlaybookDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "", 10);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { data: playbook, isLoading } = useGetPlaybook(id, {
    query: { enabled: Number.isFinite(id) } as any,
  });
  const { data: roles = [] } = useListRoles();
  const { data: allPlaybooks = [] } = useListPlaybooks();
  const [mode, setMode] = useState<Mode>("reference");

  // Local working copy in edit mode
  const [draft, setDraft] = useState<Playbook | null>(null);

  useEffect(() => {
    if (playbook) setDraft(playbook);
  }, [playbook]);

  const updateMutation = useUpdatePlaybook({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetPlaybookQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListPlaybooksQueryKey() });
        setMode("reference");
      },
    },
  });
  const deleteMutation = useDeletePlaybook({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPlaybooksQueryKey() });
        setLocation("/playbook-library");
      },
    },
  });

  const roleById = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of roles) m.set(r.id, r.title);
    return m;
  }, [roles]);

  if (isLoading) {
    return (
      <div className="px-6 py-8 text-sm text-slate-500">Loading playbook…</div>
    );
  }
  if (!playbook || !draft) {
    return (
      <div className="px-6 py-8 text-sm text-slate-500">Playbook not found.</div>
    );
  }

  const view = mode === "edit" ? draft : playbook;

  function patchDraft(partial: Partial<Playbook>) {
    setDraft((d) => (d ? { ...d, ...partial } : d));
  }

  function save() {
    if (!draft) return;
    updateMutation.mutate({
      id,
      data: {
        title: draft.title,
        category: draft.category,
        purpose: draft.purpose,
        whenToUse: draft.whenToUse,
        steps: draft.steps,
        decisionPoints: draft.decisionPoints,
        commonPitfalls: draft.commonPitfalls,
        relatedPlaybookIds: draft.relatedPlaybookIds,
        roleIds: draft.roleIds,
        lastReviewedBy: draft.lastReviewedBy,
      },
    });
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6 px-6 py-6">
      <Link href="/playbook-library">
        <span className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 hover:text-[#0F2A47]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Playbook Library
        </span>
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            <BookOpen className="h-3.5 w-3.5" /> Playbook
          </div>
          {mode === "edit" ? (
            <Input
              value={view.title}
              onChange={(e) => patchDraft({ title: e.target.value })}
              className="mt-1 h-auto border-slate-300 px-2 py-1 text-2xl font-semibold text-[#0F2A47]"
            />
          ) : (
            <h1 className="mt-1 text-2xl font-semibold text-[#0F2A47]">
              {view.title}
            </h1>
          )}
          <div className="mt-1 text-xs text-slate-500">
            Last reviewed{" "}
            {view.lastReviewedAt
              ? new Date(view.lastReviewedAt).toLocaleDateString()
              : "never"}
            {view.lastReviewedBy ? ` by ${view.lastReviewedBy}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === "reference" ? (
            <Button variant="outline" onClick={() => setMode("edit")} className="gap-1.5">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setDraft(playbook);
                  setMode("reference");
                }}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button
                onClick={save}
                disabled={updateMutation.isPending}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this playbook?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. Any role currently linked to it will
                  lose the link.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate({ id })}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category">
            {mode === "edit" ? (
              <Select
                value={view.category}
                onValueChange={(v) => patchDraft({ category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYBOOK_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-slate-700">{view.category}</span>
            )}
          </Field>
          <Field label="Last reviewed by">
            {mode === "edit" ? (
              <Input
                value={view.lastReviewedBy}
                onChange={(e) => patchDraft({ lastReviewedBy: e.target.value })}
              />
            ) : (
              <span className="text-sm text-slate-700">
                {view.lastReviewedBy || "—"}
              </span>
            )}
          </Field>
        </div>

        <Field label="Purpose">
          {mode === "edit" ? (
            <Textarea
              value={view.purpose}
              onChange={(e) => patchDraft({ purpose: e.target.value })}
              rows={2}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {view.purpose || <span className="italic text-slate-400">Not set.</span>}
            </p>
          )}
        </Field>

        <Field label="When to use">
          {mode === "edit" ? (
            <Textarea
              value={view.whenToUse}
              onChange={(e) => patchDraft({ whenToUse: e.target.value })}
              rows={2}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {view.whenToUse || <span className="italic text-slate-400">Not set.</span>}
            </p>
          )}
        </Field>

        <Field label="Step-by-step procedure">
          <StepEditor
            steps={view.steps}
            mode={mode}
            onChange={(steps) => patchDraft({ steps })}
          />
        </Field>

        <Field label="Decision points within the procedure">
          {mode === "edit" ? (
            <Textarea
              value={view.decisionPoints}
              onChange={(e) => patchDraft({ decisionPoints: e.target.value })}
              rows={3}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {view.decisionPoints || (
                <span className="italic text-slate-400">No branching logic captured.</span>
              )}
            </p>
          )}
        </Field>

        <Field label="Common pitfalls">
          {mode === "edit" ? (
            <Textarea
              value={view.commonPitfalls}
              onChange={(e) => patchDraft({ commonPitfalls: e.target.value })}
              rows={3}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {view.commonPitfalls || (
                <span className="italic text-slate-400">No pitfalls captured.</span>
              )}
            </p>
          )}
        </Field>

        <Field label="Linked roles">
          {mode === "edit" ? (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {roles.map((r) => {
                const checked = view.roleIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = new Set(view.roleIds);
                        if (v) next.add(r.id);
                        else next.delete(r.id);
                        patchDraft({ roleIds: Array.from(next) });
                      }}
                    />
                    <span>{r.title}</span>
                  </label>
                );
              })}
            </div>
          ) : view.roleIds.length === 0 ? (
            <span className="text-sm italic text-slate-400">Not linked to any role yet.</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {view.roleIds.map((rid) => (
                <Link key={rid} href={`/my-roles/${rid}`}>
                  <span className="cursor-pointer rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">
                    {roleById.get(rid) ?? `Role #${rid}`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Field>

        <Field label="Related playbooks">
          {mode === "edit" ? (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {allPlaybooks
                .filter((p) => p.id !== id)
                .map((p) => {
                  const checked = view.relatedPlaybookIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = new Set(view.relatedPlaybookIds);
                          if (v) next.add(p.id);
                          else next.delete(p.id);
                          patchDraft({ relatedPlaybookIds: Array.from(next) });
                        }}
                      />
                      <span>{p.title}</span>
                    </label>
                  );
                })}
            </div>
          ) : view.relatedPlaybookIds.length === 0 ? (
            <span className="text-sm italic text-slate-400">No related playbooks.</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {view.relatedPlaybookIds.map((pid) => {
                const pb = allPlaybooks.find((p) => p.id === pid);
                if (!pb) return null;
                return (
                  <Link key={pid} href={`/playbook-library/${pid}`}>
                    <span className="cursor-pointer rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                      {pb.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Field>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </Label>
      {children}
    </div>
  );
}

function StepEditor({
  steps,
  mode,
  onChange,
}: {
  steps: Step[];
  mode: Mode;
  onChange: (steps: Step[]) => void;
}) {
  if (mode === "reference") {
    if (steps.length === 0) {
      return (
        <span className="text-sm italic text-slate-400">No steps captured yet.</span>
      );
    }
    return (
      <ol className="space-y-2 text-sm text-slate-700">
        {steps.map((s, i) => (
          <li key={s.id} className="flex gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
              {i + 1}
            </span>
            <span className="whitespace-pre-wrap">{s.text}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-start gap-2">
          <span className="mt-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
            {i + 1}
          </span>
          <Textarea
            value={s.text}
            onChange={(e) => {
              const next = steps.slice();
              next[i] = { ...s, text: e.target.value };
              onChange(next);
            }}
            rows={2}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-rose-600"
            onClick={() => onChange(steps.filter((x) => x.id !== s.id))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...steps, { id: newId(), text: "" }])}
        className="gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" /> Add step
      </Button>
    </div>
  );
}
