import { useEffect, useRef } from "react";
import {
  Switch,
  Route,
  Router as WouterRouter,
  Redirect,
  useLocation,
} from "wouter";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
} from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { Organizations } from "@/pages/organizations";
import { OrganizationDetail } from "@/pages/organization-detail";
import { UrgentDental } from "@/pages/urgent-dental";
import { IdealWeek } from "@/pages/ideal-week";
import { LivingYourBestYearEver } from "@/pages/living-your-best-year-ever";
import { VisionBoard } from "@/pages/vision-board";
import { DirectReports } from "@/pages/direct-reports";
import { WeeklyReview } from "@/pages/weekly-review";
import { MeetingsLeadership } from "@/pages/meetings-leadership";
import { MeetingsSeriesNew } from "@/pages/meetings-series-new";
import { MeetingsSeriesDetail } from "@/pages/meetings-series-detail";
import { MeetingsAgenda } from "@/pages/meetings-agenda";
import { MeetingsOneOnOnes } from "@/pages/meetings-one-on-ones";
import { TeamPlaceholder } from "@/pages/team-placeholder";
import { ActionItems } from "@/pages/action-items";
import { BuildoutBoard } from "@/pages/buildout-board";
import { RolesIndex } from "@/pages/roles-index";
import { RoleDetail } from "@/pages/role-detail";
import { PlaybookLibrary } from "@/pages/playbook-library";
import { PlaybookDetail } from "@/pages/playbook-detail";
import { ActionItemsProvider } from "@/contexts/action-items-context";
import { ActiveUserProvider } from "@/contexts/active-user-context";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || undefined;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment.");
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl:
      typeof window !== "undefined"
        ? `${window.location.origin}${basePath}/logo.svg`
        : `${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#0F2A47",
    colorForeground: "#0F2A47",
    colorMutedForeground: "#64748b",
    colorDanger: "#D62828",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#0F2A47",
    colorNeutral: "#cbd5e1",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.625rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden border border-slate-200 shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#0F2A47] text-xl font-semibold",
    headerSubtitle: "text-slate-500 text-sm",
    socialButtonsBlockButtonText: "text-[#0F2A47] font-medium",
    formFieldLabel: "text-[#0F2A47] text-sm font-medium",
    formFieldInput:
      "border-slate-300 focus:border-[#0F2A47] focus:ring-[#0F2A47]",
    formButtonPrimary:
      "bg-[#0F2A47] hover:bg-[#0a1e33] text-white font-semibold",
    footerActionLink: "text-[#D62828] font-medium hover:underline",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-500",
    dividerLine: "bg-slate-200",
    socialButtonsBlockButton:
      "border-slate-300 hover:bg-slate-50 text-[#0F2A47]",
    identityPreviewEditButton: "text-[#0F2A47]",
    formFieldSuccessText: "text-emerald-600",
    alertText: "text-[#0F2A47]",
    alert: "bg-amber-50 border border-amber-200",
    otpCodeFieldInput: "border-slate-300",
    formFieldRow: "gap-2",
    main: "gap-4",
    logoBox: "justify-center",
    logoImage: "h-10",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

/**
 * Clears the React Query cache whenever the signed-in user changes,
 * so a new teammate's session never sees stale data from the previous
 * user.
 */
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/"><Redirect to="/ideal-week" /></Route>
        <Route path="/ideal-week" component={IdealWeek} />
        <Route path="/weekly-review" component={WeeklyReview} />
        <Route
          path="/living-your-best-year-ever"
          component={LivingYourBestYearEver}
        />
        <Route path="/vision-board" component={VisionBoard} />
        <Route path="/organizations" component={Organizations} />
        <Route path="/organizations/:id" component={OrganizationDetail} />
        <Route path="/urgent-dental" component={UrgentDental} />
        {/*
         * Phase 2 IA: Members + Org Chart now live under the Team group.
         * The previous URLs (/direct-reports, /my-roles, /org-chart) keep
         * working for one cycle as redirects so any bookmarks stay valid.
         */}
        <Route path="/team/members" component={DirectReports} />
        <Route path="/team/org-chart" component={RolesIndex} />
        <Route path="/team/org-chart/:id" component={RoleDetail} />
        <Route path="/direct-reports"><Redirect to="/team/members" /></Route>
        <Route path="/my-roles"><Redirect to="/team/org-chart" /></Route>
        <Route path="/my-roles/:id">
          {(params) => <Redirect to={`/team/org-chart/${params.id}`} />}
        </Route>
        <Route path="/org-chart"><Redirect to="/team/org-chart" /></Route>
        <Route path="/org-chart/seats/:id"><Redirect to="/team/org-chart" /></Route>
        <Route path="/action-items" component={ActionItems} />
        <Route path="/edge-buildout-board" component={BuildoutBoard} />
        <Route path="/edge-lease-matrix">
          <Redirect to="/organizations?tab=lease-matrix" />
        </Route>
        <Route path="/playbook-library" component={PlaybookLibrary} />
        <Route path="/playbook-library/:id" component={PlaybookDetail} />
        <Route path="/team/reports">
          <TeamPlaceholder
            title="Team Reports"
            description="Reports submitted by your team."
          />
        </Route>
        <Route path="/team/my-reports">
          <TeamPlaceholder
            title="My Reports"
            description="Reports you have submitted."
          />
        </Route>
        <Route path="/team/fill-out-a-report">
          <TeamPlaceholder
            title="Fill Out a Report"
            description="Submit a new report for review."
          />
        </Route>
        <Route path="/team/kra-assistant">
          <TeamPlaceholder
            title="KRA Assistant"
            description="Get help defining Key Result Areas for any role."
          />
        </Route>
        <Route path="/meetings/leadership" component={MeetingsLeadership} />
        <Route
          path="/meetings/leadership/new"
          component={MeetingsSeriesNew}
        />
        <Route
          path="/meetings/leadership/series/:id"
          component={MeetingsSeriesDetail}
        />
        <Route
          path="/meetings/leadership/agendas/:id"
          component={MeetingsAgenda}
        />
        <Route path="/meetings/one-on-ones" component={MeetingsOneOnOnes} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

/**
 * Authenticated shell — only mounted when Clerk reports the visitor is
 * signed in. ActiveUserProvider relies on `useUser()` returning a loaded
 * user, and ActionItemsProvider hits `/api` endpoints that now require
 * a session.
 */
function AuthedApp() {
  return (
    <ActiveUserProvider>
      <ActionItemsProvider>
        <AppRouter />
      </ActionItemsProvider>
    </ActiveUserProvider>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome to EDG Dashboard",
            subtitle: "Sign in to manage your dental practice",
          },
        },
        signUp: {
          start: {
            title: "Create your EDG account",
            subtitle: "Get started with your CEO dashboard",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        {/*
          AUTH IS CURRENTLY DISABLED while the app is being built — the
          app always renders as if a teammate is signed in. /sign-in and
          /sign-up redirect to home so old links don't show a login wall.
          To re-enable, restore the <Show when="signed-in">/<Show when="signed-out">
          gate that lived here (see git history) and re-mount SignInPage /
          SignUpPage on those routes.
        */}
        <Switch>
          <Route path="/sign-in/*?"><Redirect to="/" /></Route>
          <Route path="/sign-up/*?"><Redirect to="/" /></Route>
          <Route>
            <AuthedApp />
          </Route>
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <TooltipProvider>
        <ClerkProviderWithRoutes />
      </TooltipProvider>
    </WouterRouter>
  );
}

export default App;
