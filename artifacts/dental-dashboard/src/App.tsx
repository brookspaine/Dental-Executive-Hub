import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { Organizations } from "@/pages/organizations";
import { OrganizationDetail } from "@/pages/organization-detail";
import { UrgentDental } from "@/pages/urgent-dental";
import { OrgChart } from "@/pages/org-chart";
import { SeatDetail } from "@/pages/seat-detail";
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
import { ActionItemsProvider } from "@/contexts/action-items-context";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/"><Redirect to="/ideal-week" /></Route>
        <Route path="/ideal-week" component={IdealWeek} />
        <Route path="/weekly-review" component={WeeklyReview} />
        <Route path="/living-your-best-year-ever" component={LivingYourBestYearEver} />
        <Route path="/vision-board" component={VisionBoard} />
        <Route path="/organizations" component={Organizations} />
        <Route path="/organizations/:id" component={OrganizationDetail} />
        <Route path="/urgent-dental" component={UrgentDental} />
        <Route path="/org-chart" component={OrgChart} />
        <Route path="/org-chart/seats/:id" component={SeatDetail} />
        <Route path="/direct-reports" component={DirectReports} />
        <Route path="/action-items" component={ActionItems} />
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
        <Route path="/meetings/leadership/new" component={MeetingsSeriesNew} />
        <Route path="/meetings/leadership/series/:id" component={MeetingsSeriesDetail} />
        <Route path="/meetings/leadership/agendas/:id" component={MeetingsAgenda} />
        <Route path="/meetings/one-on-ones" component={MeetingsOneOnOnes} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ActionItemsProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </ActionItemsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
