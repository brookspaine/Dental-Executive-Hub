import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { Dashboard } from "@/pages/dashboard";
import { Organizations } from "@/pages/organizations";
import { OrganizationDetail } from "@/pages/organization-detail";
import { UrgentDental } from "@/pages/urgent-dental";
import { OrgChart } from "@/pages/org-chart";
import { SeatDetail } from "@/pages/seat-detail";
import { IdealWeek } from "@/pages/ideal-week";
import { LivingYourBestYearEver } from "@/pages/living-your-best-year-ever";
import { DirectReports } from "@/pages/direct-reports";
import { Announcements } from "@/pages/announcements";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/"><Redirect to="/ideal-week" /></Route>
        <Route path="/ideal-week" component={IdealWeek} />
        <Route path="/living-your-best-year-ever" component={LivingYourBestYearEver} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/organizations" component={Organizations} />
        <Route path="/organizations/:id" component={OrganizationDetail} />
        <Route path="/urgent-dental" component={UrgentDental} />
        <Route path="/org-chart" component={OrgChart} />
        <Route path="/org-chart/seats/:id" component={SeatDetail} />
        <Route path="/direct-reports" component={DirectReports} />
        <Route path="/announcements" component={Announcements} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
