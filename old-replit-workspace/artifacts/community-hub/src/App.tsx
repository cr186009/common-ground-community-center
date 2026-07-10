import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { HubShell } from '@/components/hub-shell';
import NotFound from '@/pages/not-found';
import HomePage from '@/pages/home';
import EventsPage from '@/pages/events';
import EventDetailPage from '@/pages/event-detail';
import AlertsPage from '@/pages/alerts';
import MeetingsPage from '@/pages/meetings';
import MeetingDetailPage from '@/pages/meeting-detail';
import ActivitiesPage from '@/pages/activities';
import SearchPage from '@/pages/search';
import SubmitPage from '@/pages/submit';
import VolunteerPage from '@/pages/volunteer';
import AboutPage from '@/pages/about';
import AdminPage from '@/pages/admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

function Router() {
  return (
    <HubShell>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/events" component={EventsPage} />
        <Route path="/events/:id" component={EventDetailPage} />
        <Route path="/alerts" component={AlertsPage} />
        <Route path="/meetings" component={MeetingsPage} />
        <Route path="/meetings/:id" component={MeetingDetailPage} />
        <Route path="/activities" component={ActivitiesPage} />
        <Route path="/search" component={SearchPage} />
        <Route path="/submit" component={SubmitPage} />
        <Route path="/volunteer" component={VolunteerPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/sources" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </HubShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
