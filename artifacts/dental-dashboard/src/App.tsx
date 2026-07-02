import {
  Switch,
  Route,
  Router as WouterRouter,
  Redirect,
} from "wouter";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { CommandCenter } from "@/pages/command-center";
import { IdealWeek } from "@/pages/ideal-week";
import { LivingYourBestYearEver } from "@/pages/living-your-best-year-ever";
import { VisionBoard } from "@/pages/vision-board";
import { WeeklyReview } from "@/pages/weekly-review";
import { ActiveUserProvider } from "@/contexts/active-user-context";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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
        <Route path="/command-center" component={CommandCenter} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ActiveUserProvider>
            <AppRouter />
          </ActiveUserProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
