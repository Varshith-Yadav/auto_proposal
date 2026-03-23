import { motion } from "framer-motion";
import { Calendar, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchScore } from "@/components/MatchScore";
import { Link } from "react-router-dom";

interface Opportunity {
  id: string;
  title: string;
  agency: string;
  value: string;
  setAside: string;
  deadline: string;
  daysLeft: number;
  naics: string;
  matchScore: number;
}

export function OpportunityCard({ opp }: { opp: Opportunity }) {
  const deadlineColor =
    opp.daysLeft < 7 ? "text-destructive" : opp.daysLeft < 14 ? "text-warning" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="group rounded-xl border border-border bg-card p-6 hover:border-accent/30 transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2">{opp.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Building2 className="h-3 w-3" />
            <span>{opp.agency}</span>
          </div>
        </div>
        <MatchScore score={opp.matchScore} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="inline-flex items-center rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
          {opp.value}
        </span>
        <span className="inline-flex items-center rounded-md bg-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary-foreground/80">
          {opp.setAside}
        </span>
        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {opp.naics}
        </span>
      </div>

      <div className={`flex items-center gap-1 text-xs ${deadlineColor} mb-4`}>
        <Calendar className="h-3 w-3" />
        <span>
          {opp.deadline} ({opp.daysLeft}d left)
        </span>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
          <Link to={`/proposal/${opp.id}`}>View Details</Link>
        </Button>
        <Button variant="accent" size="sm" className="flex-1 text-xs" asChild>
          <Link to={`/proposal/${opp.id}`}>
            Draft Proposal <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}
