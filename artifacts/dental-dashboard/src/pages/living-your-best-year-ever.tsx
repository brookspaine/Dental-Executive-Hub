import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GoalRow = { text: string; status: string; nextSteps: string };

type SectionData = {
  identity: string[];
  why: string[];
  howIPreserve: string[];
  feelsLike: string[];
  outcomeGoals: GoalRow[];
  performanceGoals: GoalRow[];
  processContinue: GoalRow[];
  processMoreConsistent: GoalRow[];
  processBegin: GoalRow[];
};

type SectionDef = {
  key: string;
  number: number;
  title: string;
  seed: SectionData;
};

const STATUS_OPTIONS = [
  "Not started",
  "In progress",
  "Launched",
  "Consistent/Achieved",
];

const STATUS_COLORS: Record<string, string> = {
  "Not started": "bg-muted text-muted-foreground",
  "In progress": "bg-amber-100 text-amber-800",
  "Launched": "bg-blue-100 text-blue-800",
  "Consistent/Achieved": "bg-green-100 text-green-800",
};

const empty: SectionData = {
  identity: [],
  why: [],
  howIPreserve: [],
  feelsLike: [],
  outcomeGoals: [],
  performanceGoals: [],
  processContinue: [],
  processMoreConsistent: [],
  processBegin: [],
};

const SECTIONS: SectionDef[] = [
  {
    key: "health-fitness",
    number: 1,
    title: "Health / Fitness",
    seed: {
      ...empty,
      identity: [
        "The fit husband and father who has a six-pack.",
        "He has the confidence and energy to be the most productive version of himself that helps achieve goals in all other areas of life.",
      ],
      why: [
        "I'm tired of not being fit",
        "I want to be in the best shape of my life",
        "I want to have confidence and energy to be the most productive version of myself to achieve all other goals in life",
      ],
      howIPreserve: [
        "follow specific diet plan in ideal week",
        "follows habits in AMS",
        "no candy / one cheat meal / dessert per week",
        "commit to a time each day around schedule when you'll workout",
      ],
      feelsLike: [
        "Confidence, shredded when shirt is off, trim and fit in all fits",
        "Super dad that kids look up to and model habits of",
        "Great energy and confidence that allows me to be most productive version of myself",
      ],
      outcomeGoals: [{ text: "Six Pack Abs", status: "In progress", nextSteps: "" }],
      performanceGoals: [
        { text: "185-190 lbs", status: "Consistent/Achieved", nextSteps: "" },
        { text: "14% BF by July 1", status: "In progress", nextSteps: "BF measure next week (March 18th)" },
      ],
      processContinue: [
        {
          text: "Workouts 5 days/week",
          status: "In progress",
          nextSteps:
            "Go to bed 9:30 to get up earlier, wake up and do morning workout in home office if needed, get workouts in (lifts) days off",
        },
        { text: "No sugars from candy 2026", status: "Consistent/Achieved", nextSteps: "" },
      ],
      processMoreConsistent: [
        { text: "Walking pad for extra steps", status: "In progress", nextSteps: "" },
      ],
      processBegin: [
        { text: "Go keto last week each month", status: "Not started", nextSteps: "Maybe after blood test this week" },
        { text: "Improve each quarterly blood panels", status: "In progress", nextSteps: "Next draw: March 12 @ 6:50am" },
        { text: "Prioritize my dental health", status: "In progress", nextSteps: "Check in with Marquita" },
      ],
    },
  },
  {
    key: "business",
    number: 2,
    title: "Business",
    seed: {
      ...empty,
      identity: [
        "An extremely successful entrepreneur and CEO who built and sold EDGE for multimillion dollars all while making a difference in dentistry.",
      ],
      why: [
        "There is such a need for a place to immediately go for people in pain",
        "The process of building something truly special makes me feel alive.",
        "Future freedom for my family and resources to serve others.",
        "Other fields of dentistry are dying",
        "I don't want to be at the chair all my life",
        "Embarrassment by not taking action from those knowing how far I am in with this from friends, family, coaches, and mentors",
      ],
      howIPreserve: [
        "number 1 priority over other business involvements ***",
        "doing imperfectly is better than not doing at all",
        "don't get in your own way",
      ],
      feelsLike: [
        "Feeling alive",
        "A sense of accomplishment and ability to do more from growth",
        "Fulfillment that I provided freedom for my family",
        "Badass",
      ],
      outcomeGoals: [
        { text: "Build and sell EDGE platform for multimillion dollars", status: "In progress", nextSteps: "" },
      ],
      performanceGoals: [
        {
          text: "Sign lease on winning space by March 1",
          status: "Launched",
          nextSteps: "1) Alston - Review Lease - Get to Yes\nReceived Lease",
        },
        { text: "Open first Op Co and hit 150k production by year end", status: "Not started", nextSteps: "" },
        {
          text: "Ready for sites #2, 3 by EOY",
          status: "In progress",
          nextSteps: "South Square LOI Update\nCloser to Agreement",
        },
      ],
      processMoreConsistent: [
        {
          text: "Spend 1 hr on site selection each day",
          status: "In progress",
          nextSteps: "See above\nLock in South Square, Alston",
        },
        {
          text: "Read 15 min per day on Leadership",
          status: "Consistent/Achieved",
          nextSteps: "Continue down Ben Horowitz' path",
        },
      ],
      processBegin: [
        {
          text: "Cultivate 1-2 business relationships to start building our team and partners",
          status: "In progress",
          nextSteps: "TSCG, Adam Webb - Promising",
        },
      ],
    },
  },
  {
    key: "mindset",
    number: 3,
    title: "Mindset",
    seed: {
      ...empty,
      identity: [
        "A Man of Grit & Perseverance",
        "A Man of Wisdom and Influence",
        "Master Protector of My Time",
      ],
      why: [
        "Nothing will be easy — Grit and Perseverance are needed to get through and accomplish my goals.",
        "Wisdom and Influence are essential qualities to being a successful entrepreneur and CEO.",
        "Preserve time to focus on achieving my goals.",
      ],
      howIPreserve: [
        "Read 15 minutes daily",
        "Daily habits through Ideal week, daily brainwashing, Words of Wisdom",
        "Daily meditation",
        "Stay grounded in my Faith",
        "Focus on becoming the identity of the person you need to be for your goals",
        "Emotional Intelligence ***",
      ],
      feelsLike: [
        "Nothing can stop me with determination and persistence",
        "Confidence in wisdom to make better decision to serve my family and others",
        "Freedom to cherish moments with family, friends, and serve others",
      ],
      outcomeGoals: [
        { text: "A Man of Grit & Perseverance", status: "Launched", nextSteps: "Discussion with Chad" },
        { text: "A Man of Wisdom and Influence", status: "Launched", nextSteps: "" },
        { text: "Master Protector of My Time", status: "Launched", nextSteps: "" },
      ],
      processContinue: [
        { text: "Ideal Week Framework", status: "Consistent/Achieved", nextSteps: "" },
        { text: "Weekly Reflections", status: "Consistent/Achieved", nextSteps: "Today" },
        { text: "Read 15 minutes daily", status: "Consistent/Achieved", nextSteps: "" },
      ],
      processMoreConsistent: [
        { text: "Evening Reflections", status: "Launched", nextSteps: "" },
      ],
      processBegin: [
        {
          text: "Building Emotional Intelligence",
          status: "Not started",
          nextSteps: "Start Reading Emotional Intelligence (Goleman)",
        },
      ],
    },
  },
  {
    key: "family",
    number: 4,
    title: "Family",
    seed: {
      ...empty,
      identity: ["Dad of the Year", "Soulmate to Mariah"],
      why: [
        "Mariah is my best friend and soul mate. I can't imagine life without her.",
        "She makes me the happiest man alive and she's always there for me.",
        "Callen is our miracle child. He's part of my DNA and a growth of my family tree.",
        "Callen will be a future reflection of how I parent him and the type of father I am to him.",
        "How good a father I am to him will help determine the success he has in the future.",
      ],
      howIPreserve: [
        "Prioritize family over work",
        "Block time for work early to allow for time with family",
        "Don't work while with family",
      ],
      outcomeGoals: [
        { text: "Dad of the Year", status: "Launched", nextSteps: "Spend time later with" },
        { text: "Soulmate to Mariah", status: "Launched", nextSteps: "" },
      ],
      processContinue: [
        { text: "Spend 1 hr per day being Dad of the Year with Callen", status: "Consistent/Achieved", nextSteps: "" },
        {
          text: "One date per week with Mariah",
          status: "Consistent/Achieved",
          nextSteps:
            "Date night this week? Coffee with her and Callen?\nMust be intentionally planned. Can be night out, coffee date, Netflix date after Callen goes down, etc.",
        },
      ],
      processBegin: [
        { text: "Weekly check-ins with Mariah when EDGE starts up", status: "Not started", nextSteps: "" },
      ],
    },
  },
  {
    key: "legacy-wealth",
    number: 5,
    title: "Legacy Wealth",
    seed: {
      ...empty,
      identity: ["Legacy wealth for future freedom"],
      why: [
        "Future freedom for my family",
        "Resources to serve others",
        "Freedom and resources to build more platforms to serve others",
      ],
      howIPreserve: [
        "Budget and know expenses",
        "Share budget and expenses with Mariah to improve spending habits",
        "Discipline to invest monthly",
        "Spend little, build the war chest",
      ],
      outcomeGoals: [
        { text: "Legacy wealth for future freedom", status: "In progress", nextSteps: "" },
      ],
      performanceGoals: [
        { text: "Produce 110k/mo at UD", status: "In progress", nextSteps: "110k prod. in Jan." },
        { text: "Earn 120k in UD distributions in 2026 (10k/mo)", status: "Launched", nextSteps: "16k check from Dec." },
        { text: "Save 100k and reinvest in EDGE", status: "In progress", nextSteps: "Distribution checks going into savings vault" },
      ],
      processContinue: [
        { text: "Monthly Financial Review", status: "Consistent/Achieved", nextSteps: "today" },
        { text: "Primerica 401k Transfer to John Hancock", status: "In progress", nextSteps: "Do Mon AM" },
      ],
      processBegin: [
        { text: "Future RE investments (EDGE, Morgantown, etc.)", status: "Not started", nextSteps: "" },
        { text: "Start Callen college account", status: "Not started", nextSteps: "Invest when the market corrects this year" },
        { text: "Follow sticky budget w/ Mariah", status: "Not started", nextSteps: "" },
      ],
    },
  },
  {
    key: "faith",
    number: 6,
    title: "Faith",
    seed: {
      ...empty,
      identity: ["Serving others by being a testament of God"],
      why: [
        "God created me and put me here for a purpose",
        "To serve God's Kingdom and be a testament of God",
        "To help others become followers of Christ and bring more to Heaven",
      ],
      howIPreserve: [
        "daily Rick Warren devotionals",
        "Read Bible nightly",
        "pray each morning and spend quiet time with God",
        "Don't get caught up in worldly desires",
      ],
      outcomeGoals: [
        { text: "Finish reading the Bible in 2026", status: "In progress", nextSteps: "" },
        {
          text: "Find a way to serve others with current resources to the community, career, or mentor young entrepreneurs and devote time to it.",
          status: "In progress",
          nextSteps: "Vilma and her new cleaning business",
        },
      ],
      processBegin: [
        { text: "Nightly devotionals before bed with Mariah", status: "Not started", nextSteps: "Start back up" },
      ],
    },
  },
  {
    key: "lifestyle-travel",
    number: 7,
    title: "Lifestyle and Travel",
    seed: {
      ...empty,
      identity: ["Freedom to experience the world with family and create memories."],
      why: [
        "Explore the beautiful world",
        "Cherish experiences and moments with family and friends.",
        "Allow time for mindfulness and gratitude to reset and be at my best.",
      ],
      howIPreserve: [
        "Discuss ideas with Mariah",
        "Intentionally plan logistics (who watches Callen and Rosie, responsibilities while away from work, etc.)",
      ],
      outcomeGoals: [
        { text: "Non-negotiable family trip each year", status: "Launched", nextSteps: "Italy in May\nTrip is booked!" },
        { text: "Non-negotiable husband/wife trip w/ Mariah each year", status: "Not started", nextSteps: "Plan*" },
      ],
    },
  },
  {
    key: "relationships",
    number: 8,
    title: "Relationships",
    seed: {
      ...empty,
      identity: ["Best Friend Others Have", "Loving Son and Sibling my family has"],
      why: [
        "My parents love me, they raised me when times weren't always easy, and I owe them everything.",
        "It makes my parents' day when I talk with them or visit them. They won't always be here for me to do that.",
        "Having fun with friends gives me joy and resets me mentally.",
        "At the end of the day we are only left with our relationships, integrity, and relationship with God.",
      ],
      howIPreserve: [
        "Keep in touch with friendships to maintain (calls, questions with things, plan trips)",
        "Prioritize family and parents (plan holidays, visits, talk on phone)",
      ],
      performanceGoals: [
        { text: "Talk to my parents at least once per week.", status: "Launched", nextSteps: "Call Today" },
        { text: "Spend dedicated time with in person or catching up with friends each week.", status: "Consistent/Achieved", nextSteps: "" },
      ],
    },
  },
];

type SectionRow = {
  id: number;
  sectionKey: string;
  content: string;
  updatedAt: string;
};

function InlineText({
  value,
  onChange,
  placeholder,
  multiline = false,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  const commit = () => {
    if (draft !== value) onChange(draft);
  };
  if (multiline) {
    return (
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder={placeholder}
        className={`w-full bg-transparent text-sm leading-snug resize-none outline-none focus:bg-muted/40 rounded px-1 py-0.5 min-h-[1.5em] ${className}`}
        rows={Math.max(1, draft.split("\n").length)}
      />
    );
  }
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      placeholder={placeholder}
      className={`w-full bg-transparent text-sm outline-none focus:bg-muted/40 rounded px-1 py-0.5 ${className}`}
    />
  );
}

function BulletList({
  title,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((it, idx) => (
          <li key={idx} className="flex items-start gap-2 group">
            <span className="text-muted-foreground mt-1.5">•</span>
            <div className="flex-1">
              <InlineText
                value={it}
                onChange={(v) => {
                  const next = [...items];
                  next[idx] = v;
                  onChange(next);
                }}
                placeholder={placeholder}
                multiline
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              aria-label="Delete bullet"
              className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 mt-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Add
      </Button>
    </div>
  );
}

function GoalsTable({
  title,
  rows,
  onChange,
  goalLabel = "Goal",
}: {
  title: string;
  rows: GoalRow[];
  onChange: (next: GoalRow[]) => void;
  goalLabel?: string;
}) {
  const update = (idx: number, patch: Partial<GoalRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));
  const add = () =>
    onChange([...rows, { text: "", status: "Not started", nextSteps: "" }]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{title}</div>
      <div className="rounded-md border overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_1fr_32px] bg-muted/60 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
          <div className="px-3 py-2">{goalLabel}</div>
          <div className="px-3 py-2">Status</div>
          <div className="px-3 py-2">Next Steps</div>
          <div />
        </div>
        {rows.length === 0 && (
          <div className="px-3 py-3 text-xs italic text-muted-foreground">
            No items yet.
          </div>
        )}
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[1fr_140px_1fr_32px] border-t items-start group"
          >
            <div className="px-2 py-1.5">
              <InlineText
                value={row.text}
                onChange={(v) => update(idx, { text: v })}
                placeholder="Goal…"
                multiline
              />
            </div>
            <div className="px-2 py-1.5">
              <Select
                value={row.status || "Not started"}
                onValueChange={(v) => update(idx, { status: v })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded ${STATUS_COLORS[s] ?? ""}`}
                      >
                        {s}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="px-2 py-1.5">
              <InlineText
                value={row.nextSteps}
                onChange={(v) => update(idx, { nextSteps: v })}
                placeholder="Next steps…"
                multiline
              />
            </div>
            <div className="px-1 py-2 flex items-start justify-center">
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Delete row"
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Add row
      </Button>
    </div>
  );
}

function parseSection(seed: SectionData, raw: string | undefined): SectionData {
  if (!raw) return seed;
  try {
    const parsed = JSON.parse(raw);
    return { ...seed, ...parsed } as SectionData;
  } catch {
    return seed;
  }
}

function SectionCard({
  def,
  initialContent,
  hasSavedContent,
}: {
  def: SectionDef;
  initialContent: string | undefined;
  hasSavedContent: boolean;
}) {
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";

  const [data, setData] = useState<SectionData>(() =>
    parseSection(def.seed, initialContent)
  );
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const saveMut = useMutation({
    mutationFn: async (next: SectionData) => {
      const res = await fetch(`${base}api/yearly-planning/${def.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(next) }),
      });
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      setSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ["yearly-planning"] });
    },
  });

  // If the server didn't have any saved content yet, seed it on first mount.
  const didSeed = useRef(false);
  useEffect(() => {
    if (!hasSavedContent && !didSeed.current) {
      didSeed.current = true;
      saveMut.mutate(def.seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<SectionData>) => {
    const next = { ...data, ...patch };
    setData(next);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveMut.mutate(next);
    }, 600);
  };

  return (
    <Card id={def.key}>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap border-b pb-4">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-primary">{def.number}.</span>
            <h2 className="text-2xl font-bold">{def.title}</h2>
          </div>
          <div className="text-xs text-muted-foreground">
            {dirty
              ? "Saving…"
              : savedAt
                ? `Saved ${savedAt.toLocaleTimeString()}`
                : "Auto-saves as you type"}
          </div>
        </div>

        <div className="space-y-2">
          {data.identity.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2 group">
              <div className="flex-1">
                <InlineText
                  value={line}
                  onChange={(v) => {
                    const next = [...data.identity];
                    next[idx] = v;
                    update({ identity: next });
                  }}
                  placeholder="Identity statement…"
                  multiline
                  className="text-lg font-semibold leading-snug"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  update({ identity: data.identity.filter((_, i) => i !== idx) })
                }
                aria-label="Delete identity statement"
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 mt-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => update({ identity: [...data.identity, ""] })}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add identity statement
          </Button>
        </div>

        <BulletList
          title="WHY? — Key motivators"
          items={data.why}
          onChange={(v) => update({ why: v })}
          placeholder="Why does this matter?"
        />

        <BulletList
          title={`How I preserve ${def.title}?`}
          items={data.howIPreserve}
          onChange={(v) => update({ howIPreserve: v })}
          placeholder="Practice or commitment…"
        />

        <BulletList
          title="What does this goal feel like?"
          items={data.feelsLike}
          onChange={(v) => update({ feelsLike: v })}
          placeholder="Describe the feeling…"
        />

        <div className="space-y-4">
          <h3 className="text-lg font-bold">Goals</h3>

          <GoalsTable
            title="Outcome-Goals"
            goalLabel="Outcome-Goals"
            rows={data.outcomeGoals}
            onChange={(v) => update({ outcomeGoals: v })}
          />

          <GoalsTable
            title="Performance-Goals"
            goalLabel="Performance-Goals"
            rows={data.performanceGoals}
            onChange={(v) => update({ performanceGoals: v })}
          />

          <div className="space-y-3 rounded-md border p-3">
            <div className="text-sm font-semibold">Process-Goals</div>
            <GoalsTable
              title="Continue"
              rows={data.processContinue}
              onChange={(v) => update({ processContinue: v })}
            />
            <GoalsTable
              title="Become More Consistent"
              rows={data.processMoreConsistent}
              onChange={(v) => update({ processMoreConsistent: v })}
            />
            <GoalsTable
              title="Begin"
              rows={data.processBegin}
              onChange={(v) => update({ processBegin: v })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LivingYourBestYearEver() {
  const base = import.meta.env.BASE_URL || "/";
  const { data: sections, isLoading } = useQuery<SectionRow[]>({
    queryKey: ["yearly-planning"],
    queryFn: async () => {
      const res = await fetch(`${base}api/yearly-planning`);
      return res.json();
    },
  });

  const byKey = useMemo(() => {
    const m = new Map<string, SectionRow>();
    (sections ?? []).forEach((s) => m.set(s.sectionKey, s));
    return m;
  }, [sections]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href="/ideal-week">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Ideal Week
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Living Your Best Year Ever
        </h1>
        <p className="text-muted-foreground">
          Yearly planning across the eight areas of life. Set the identity,
          capture the why, lock in habits, and track outcome / performance /
          process goals for each area.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Jump to section
          </div>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.key}
                href={`#${s.key}`}
                className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {s.number}. {s.title}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        SECTIONS.map((def) => {
          const row = byKey.get(def.key);
          return (
            <SectionCard
              key={def.key}
              def={def}
              initialContent={row?.content}
              hasSavedContent={Boolean(row && row.content)}
            />
          );
        })
      )}
    </div>
  );
}

export default LivingYourBestYearEver;
