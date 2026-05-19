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
import { CommandCenter } from "@/pages/command-center";
import { IdealWeek } from "@/pages/ideal-week";
import { LivingYourBestYearEver } from "@/pages/living-your-best-year-ever";
import { VisionBoard } from "@/pages/vision-board";
import { WeeklyReview } from "@/pages/weekly-review";
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
        <Route path="/command-center" component={CommandCenter} />
        <Route path="/edge-lease-matrix">
          <Redirect to="/organizations?tab=lease-matrix" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

/**
 * Authenticated shell — only mounted when Clerk reports the visitor is
 * signed in. ActiveUserProvider relies on `useUser()` returning a loaded
 * user.
 */
function AuthedApp() {
  return (
    <ActiveUserProvider>
      <AppRouter />
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
