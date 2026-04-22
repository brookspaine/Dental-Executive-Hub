import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import visionHero from "@assets/IMG_0278_1776870679483.jpeg";

const CATEGORIES: { key: string; label: string; accent: string }[] = [
  { key: "health-fitness", label: "Health/Fitness", accent: "bg-rose-50" },
  { key: "business", label: "Business", accent: "bg-amber-50" },
  { key: "mindset", label: "Mindset", accent: "bg-sky-50" },
  { key: "family", label: "Family", accent: "bg-emerald-50" },
  { key: "legacy-wealth", label: "Legacy Wealth", accent: "bg-violet-50" },
  { key: "faith", label: "Faith", accent: "bg-indigo-50" },
  { key: "lifestyle-travel", label: "Lifestyle and Travel", accent: "bg-orange-50" },
  { key: "relationships", label: "Relationships", accent: "bg-pink-50" },
];

const FIELDS: { key: keyof RowContent; label: string }[] = [
  { key: "identity", label: "Identity" },
  { key: "achievementGoals", label: "Achievement Goals" },
  { key: "habitGoals", label: "Habit Goals" },
  { key: "implementation", label: "Implementation" },
];

type RowContent = {
  identity: string;
  achievementGoals: string;
  habitGoals: string;
  implementation: string;
};

type HeaderContent = {
  quote: string;
  byline: string;
};

const DEFAULT_HEADER: HeaderContent = {
  quote:
    "Discipline leads to habits. Habits lead to consistency. Consistency leads to growth.",
  byline: "Living Your Best Year Ever — 2026",
};

const EMPTY_ROW: RowContent = {
  identity: "",
  achievementGoals: "",
  habitGoals: "",
  implementation: "",
};

function safeParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(() => {
    resize();
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      className={`w-full bg-transparent border-0 outline-none focus:bg-white/60 rounded px-2 py-1 text-sm leading-snug resize-none overflow-hidden ${className}`}
    />
  );
}

function useSection<T>(
  storageKey: string,
  fallback: T,
  rows: { sectionKey: string; content: string }[] | undefined,
) {
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";
  const [local, setLocal] = useState<T | null>(null);
  const [dirty, setDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const remote = useMemo<T>(() => {
    const row = rows?.find((r) => r.sectionKey === storageKey);
    return safeParse<T>(row?.content, fallback);
  }, [rows, storageKey]);

  useEffect(() => {
    if (!dirty) setLocal(remote);
  }, [remote, dirty]);

  const value = local ?? remote;

  const mutation = useMutation({
    mutationFn: async (next: T) => {
      const res = await fetch(`${base}api/yearly-planning/${storageKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(next) }),
      });
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["yearly-planning"] });
    },
  });

  const update = (next: T) => {
    setLocal(next);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => mutation.mutate(next), 700);
  };

  return [value, update] as const;
}

export function VisionBoard() {
  const { data: rows, isLoading } = useQuery<{ sectionKey: string; content: string }[]>({
    queryKey: ["yearly-planning"],
    queryFn: async () => {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(`${base}api/yearly-planning`);
      return res.json();
    },
  });

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vision Board</h1>
        <p className="text-sm text-muted-foreground">
          Your one-page picture of who you're becoming and what you're building this year.
        </p>
      </div>

      <Header rows={rows} isLoading={isLoading} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Living Your Best Year Ever — 2026</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-semibold text-muted-foreground w-[140px] align-bottom">
                      Category
                    </th>
                    {FIELDS.map((f) => (
                      <th
                        key={f.key}
                        className="text-left p-2 font-semibold text-muted-foreground align-bottom"
                      >
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((cat) => (
                    <CategoryRow key={cat.key} category={cat} rows={rows} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Header({
  rows,
  isLoading,
}: {
  rows: { sectionKey: string; content: string }[] | undefined;
  isLoading: boolean;
}) {
  const [header, setHeader] = useSection<HeaderContent>(
    "vb-header",
    DEFAULT_HEADER,
    rows,
  );

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px]">
        <div className="relative h-56 md:h-72 bg-muted">
          <img
            src={visionHero}
            alt="Vision board"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="p-4 flex flex-col justify-center bg-amber-50/50">
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <AutoTextarea
                value={header.quote}
                onChange={(v) => setHeader({ ...header, quote: v })}
                placeholder="Add a vision quote..."
                className="text-base italic font-medium text-foreground/90"
              />
              <AutoTextarea
                value={header.byline}
                onChange={(v) => setHeader({ ...header, byline: v })}
                placeholder="Add a byline..."
                className="text-xs text-muted-foreground mt-1"
              />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function CategoryRow({
  category,
  rows,
}: {
  category: { key: string; label: string; accent: string };
  rows: { sectionKey: string; content: string }[] | undefined;
}) {
  const [content, setContent] = useSection<RowContent>(
    `vb-${category.key}`,
    EMPTY_ROW,
    rows,
  );
  return (
    <tr className={`border-b last:border-0 align-top ${category.accent}`}>
      <td className="p-2 font-semibold text-sm border-r border-border/50">
        {category.label}
      </td>
      {FIELDS.map((f) => (
        <td key={f.key} className="p-1 border-r last:border-r-0 border-border/50">
          <AutoTextarea
            value={content[f.key]}
            onChange={(v) => setContent({ ...content, [f.key]: v })}
            placeholder={`Add ${f.label.toLowerCase()}...`}
          />
        </td>
      ))}
    </tr>
  );
}
