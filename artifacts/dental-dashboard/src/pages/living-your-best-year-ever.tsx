import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SectionRow = {
  id: number;
  sectionKey: string;
  content: string;
  updatedAt: string;
};

type SectionDef = {
  key: string;
  number: number;
  title: string;
  prompts: string[];
};

const SECTIONS: SectionDef[] = [
  {
    key: "health-fitness",
    number: 1,
    title: "Health / Fitness",
    prompts: [
      "What does my best physical self look like 12 months from now?",
      "Weight, body composition, energy level targets",
      "Workout cadence (strength, cardio, mobility) and weekly schedule",
      "Nutrition standards and non-negotiables",
      "Sleep, recovery, and stress management practices",
      "Annual physicals, bloodwork, and preventive care milestones",
    ],
  },
  {
    key: "business",
    number: 2,
    title: "Business",
    prompts: [
      "Vision for the practice(s) one year from today",
      "Revenue, collections, EBITDA, and profitability targets",
      "Operational priorities and systems to build / fix",
      "Team / hiring goals and leadership development",
      "Patient experience, marketing, and growth initiatives",
      "Personal CEO disciplines (Big 3, deep work, scorecards)",
    ],
  },
  {
    key: "mindset",
    number: 3,
    title: "Mindset",
    prompts: [
      "Identity statement: who am I becoming this year?",
      "Beliefs to install / limiting beliefs to retire",
      "Daily mindset practices (affirmations, gratitude, journaling)",
      "Books, podcasts, and courses to consume this year",
      "Coaches, mentors, or masterminds to engage",
      "Disciplines I will protect on my worst days",
    ],
  },
  {
    key: "family",
    number: 4,
    title: "Family",
    prompts: [
      "Vision for my marriage / partnership this year",
      "Vision for each child / immediate family member",
      "Weekly rhythms (date nights, one-on-ones, family meetings)",
      "Traditions, vacations, and memory-making milestones",
      "Boundaries between work and family time",
      "Ways I will lead spiritually and emotionally at home",
    ],
  },
  {
    key: "legacy-wealth",
    number: 5,
    title: "Legacy Wealth",
    prompts: [
      "Net worth target and savings rate this year",
      "Investments and asset allocation moves",
      "Real estate, practice equity, and other holdings",
      "Estate plan, trust, insurance, and tax strategy updates",
      "Generosity / giving plan",
      "Wealth I want to transfer (financial, intellectual, spiritual)",
    ],
  },
  {
    key: "faith",
    number: 6,
    title: "Faith",
    prompts: [
      "Who is God calling me to become this year?",
      "Daily devotional, prayer, and scripture rhythm",
      "Church / community involvement",
      "Service and ministry commitments",
      "Spiritual disciplines to deepen (fasting, silence, study)",
      "How my faith will visibly show up in my work and home",
    ],
  },
  {
    key: "lifestyle-travel",
    number: 7,
    title: "Lifestyle and Travel",
    prompts: [
      "Trips and experiences I will book this year (with dates)",
      "Hobbies and passions to invest time in",
      "Home, vehicles, and lifestyle upgrades",
      "How I want my calendar and weekly rhythm to feel",
      "Adventures with family and friends",
      "Personal rewards tied to hitting goals",
    ],
  },
  {
    key: "relationships",
    number: 8,
    title: "Relationships",
    prompts: [
      "Key relationships I will deepen this year",
      "New relationships / circles I will build into",
      "Mentors I will pursue and how often we'll connect",
      "Friends I want quarterly time with",
      "How I will show up as a friend, sibling, child, neighbor",
      "Toxic relationships I will set boundaries around",
    ],
  },
];

function SectionCard({ def }: { def: SectionDef }) {
  const queryClient = useQueryClient();
  const base = import.meta.env.BASE_URL || "/";

  const { data: sections } = useQuery<SectionRow[]>({
    queryKey: ["yearly-planning"],
    queryFn: async () => {
      const res = await fetch(`${base}api/yearly-planning`);
      return res.json();
    },
  });

  const saved =
    sections?.find((s) => s.sectionKey === def.key)?.content ?? "";

  const [value, setValue] = useState(saved);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!dirty) setValue(saved);
  }, [saved, dirty]);

  const saveMut = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`${base}api/yearly-planning/${def.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      setSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: ["yearly-planning"] });
    },
  });

  const handleChange = (next: string) => {
    setValue(next);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveMut.mutate(next);
    }, 800);
  };

  const handleBlur = () => {
    if (dirty) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      saveMut.mutate(value);
    }
  };

  return (
    <Card id={def.key}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold text-primary">
              {def.number}.
            </span>
            <h2 className="text-xl font-semibold">{def.title}</h2>
          </div>
          <div className="text-xs text-muted-foreground">
            {dirty
              ? "Saving…"
              : savedAt
                ? `Saved ${savedAt.toLocaleTimeString()}`
                : "Auto-saves as you type"}
          </div>
        </div>

        <div className="rounded-md bg-muted/40 p-3 border border-muted">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Prompts to consider
          </div>
          <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
            {def.prompts.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            My plan for {def.title}
          </label>
          <Textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={`Write your goals, vision, and action steps for ${def.title}…`}
            className="mt-2 min-h-[200px] text-sm leading-relaxed"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function LivingYourBestYearEver() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
          Yearly planning across the eight areas of life. Reflect, set the
          vision, and capture the goals and action steps that will move each
          area forward this year.
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

      {SECTIONS.map((def) => (
        <SectionCard key={def.key} def={def} />
      ))}
    </div>
  );
}

export default LivingYourBestYearEver;
