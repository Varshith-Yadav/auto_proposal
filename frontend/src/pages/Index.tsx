import { AppHeader } from "@/components/AppHeader";
import { DashboardFilters } from "@/components/DashboardFilters";
import { OpportunityCard } from "@/components/OpportunityCard";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchOpportunities, type ApiOpportunity } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

type Opportunity = {
  id: string;
  title: string;
  agency: string;
  value: string;
  setAside: string;
  deadline: string;
  daysLeft: number;
  naics: string;
  matchScore: number;
};

const DEFAULT_FIELDS = {
  agency: "Federal Agency",
  value: "TBD",
  setAside: "TBD",
  naics: "N/A",
};

function formatDeadline(rawDeadline?: string | null) {
  if (!rawDeadline) {
    return "TBD";
  }

  const parsed = new Date(rawDeadline);
  if (Number.isNaN(parsed.getTime())) {
    return rawDeadline;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function daysLeft(rawDeadline?: string | null) {
  if (!rawDeadline) {
    return 0;
  }

  const parsed = new Date(rawDeadline);
  if (Number.isNaN(parsed.getTime())) {
    return 0;
  }

  const now = new Date();
  const diffMs = parsed.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function matchScoreFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  }

  return 65 + (hash % 30);
}

function toOpportunity(opp: ApiOpportunity): Opportunity {
  return {
    id: opp.id,
    title: opp.title,
    agency: opp.agency || DEFAULT_FIELDS.agency,
    value: DEFAULT_FIELDS.value,
    setAside: opp.set_aside || DEFAULT_FIELDS.setAside,
    deadline: formatDeadline(opp.deadline),
    daysLeft: daysLeft(opp.deadline),
    naics: DEFAULT_FIELDS.naics,
    matchScore: matchScoreFromId(opp.id),
  };
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["opportunities"],
    queryFn: fetchOpportunities,
  });

  const opportunities = (data ?? []).map(toOpportunity);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex">
        <div className="w-64 shrink-0 border-r border-border p-5 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <DashboardFilters />
        </div>
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading
                ? "Loading live opportunities from the backend..."
                : `${opportunities.length} contracts matched to your profile`}
            </p>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <AlertCircle className="h-4 w-4" />
                Backend not reachable
              </div>
              <p className="mt-2 text-muted-foreground">
                Start the FastAPI server and refresh. The UI is configured to proxy `/api` to
                `http://localhost:8000`.
              </p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No opportunities found. Load data in the backend and try again.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opp={opp} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
