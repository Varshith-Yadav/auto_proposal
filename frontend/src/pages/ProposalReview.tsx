import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { Citation, fetchOpportunity, generateProposal, refineProposalSection } from "@/lib/api";
import { loadProfile } from "@/lib/profile";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Expand,
  Pencil,
  RefreshCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";

type SectionStatus = "verified" | "review" | "flagged";

type Section = {
  id: string;
  title: string;
  status: SectionStatus;
  content: string;
  citations?: Citation[];
};

const SECTION_DEFS = [
  { id: "exec", title: "Executive Summary", match: /executive summary/i },
  { id: "tech", title: "Technical Approach", match: /technical approach|techinical approach/i },
  { id: "past", title: "Past Performance", match: /past performance/i },
  { id: "comp", title: "Compliance Checklist", match: /compliance checklist/i },
];

function buildSections(text: string): Section[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const normalized = line.replace(/^\d+\.\s*/, "").replace(/:$/, "");
    const def = SECTION_DEFS.find((item) => item.match.test(normalized));

    if (def) {
      if (current) {
        sections.push(current);
      }
      current = { id: def.id, title: def.title, status: "review", content: "" };
      continue;
    }

    if (!current) {
      current = { id: "proposal", title: "Generated Proposal", status: "review", content: line };
    } else {
      current.content = current.content ? `${current.content}\n${line}` : line;
    }
  }

  if (current) {
    sections.push(current);
  }

  return sections.length
    ? sections
    : [{ id: "proposal", title: "Generated Proposal", status: "review", content: trimmed }];
}

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "verified") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "review") return <AlertCircle className="h-4 w-4 text-warning" />;
  return <X className="h-4 w-4 text-destructive" />;
}

function formatDate(value?: string | null) {
  if (!value) return "Not Provided";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function formatCurrency(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "Not Provided";
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      value,
    );
  }
  const normalized = Number(value);
  if (!Number.isNaN(normalized)) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      normalized,
    );
  }
  return value;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function SourceDrawer({
  open,
  onClose,
  citations,
}: {
  open: boolean;
  onClose: () => void;
  citations: Citation[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="fixed right-0 top-0 h-full w-[420px] bg-card border-l border-border z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Trust Panel</p>
                  <h2 className="text-lg font-semibold">Citations</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                These sources were retrieved and used to ground the draft. Review them to validate the AI output.
              </p>

              {citations.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No citations were returned for this proposal.
                </div>
              ) : (
                <div className="space-y-3">
                  {citations.map((citation, index) => (
                    <div
                      key={`${citation.url ?? "source"}-${index}`}
                      className="rounded-xl border border-border/80 bg-background/60 p-4"
                    >
                      <p className="text-xs font-semibold text-muted-foreground">
                        {citation.title || "Source"}
                      </p>
                      <p className="text-sm leading-relaxed mt-2">{citation.excerpt || "No excerpt available."}</p>
                      {citation.url && (
                        <p className="text-xs text-muted-foreground mt-2 break-all">{citation.url}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function ProposalReview() {
  const { id } = useParams();
  const [activeSection, setActiveSection] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const didRequest = useRef(false);

  const {
    data: opportunity,
    isLoading: oppLoading,
    error: oppError,
  } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () => fetchOpportunity(id as string),
    enabled: Boolean(id),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateProposal({
        opportunity_id: id as string,
        user_profile: loadProfile(),
      }),
  });

  const refineMutation = useMutation({
    mutationFn: refineProposalSection,
  });

  useEffect(() => {
    if (!id || oppLoading || didRequest.current) {
      return;
    }
    didRequest.current = true;
    generateMutation.mutate();
  }, [id, oppLoading, generateMutation]);

  const proposalText = generateMutation.data?.proposal_text ?? "";
  const citations = useMemo(() => generateMutation.data?.citations ?? [], [generateMutation.data]);

  useEffect(() => {
    if (proposalText) {
      setSections(buildSections(proposalText).map((section) => ({ ...section, citations })));
    }
  }, [proposalText, citations]);

  useEffect(() => {
    if (sections.length && !sections.find((section) => section.id === activeSection)) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  const reviewedCount = sections.filter((section) => section.status === "verified").length;
  const activeSectionData = sections.find((section) => section.id === activeSection);
  const generationError =
    generateMutation.isError && generateMutation.error instanceof Error
      ? generateMutation.error.message
      : null;

  const proposalStatus =
    sections.length > 0 && reviewedCount === sections.length
      ? "Ready for Submit"
      : generateMutation.isPending
        ? "Generating"
        : "Draft";

  const statusStyles =
    proposalStatus === "Ready for Submit"
      ? "bg-success/15 text-success"
      : proposalStatus === "Generating"
        ? "bg-warning/20 text-warning"
        : "bg-secondary text-foreground";

  const quickActions = useMemo(() => {
    const title = activeSectionData?.title ?? "this section";
    return [
      "Change tone to formal",
      `Expand ${title}`,
      `Add evidence for ${title}`,
      `Simplify ${title}`,
    ];
  }, [activeSectionData?.title]);

  const metadata = useMemo(() => {
    if (!opportunity) {
      return [];
    }
    const agencyName = opportunity.agency?.name || "Not Provided";
    const setAside = opportunity.set_aside_description || opportunity.set_aside || "Not Provided";
    const noticeType = opportunity.notice_type || opportunity.base_type || "Not Provided";
    const naics = opportunity.naics_primary || opportunity.naics_codes?.[0] || "Not Provided";
    const award = formatCurrency(opportunity.award?.amount);

    return [
      { label: "Agency", value: agencyName },
      { label: "Set-Aside", value: setAside },
      { label: "Solicitation Type", value: noticeType },
      { label: "Response Due", value: formatDate(opportunity.response_deadline) },
      { label: "Posted", value: formatDate(opportunity.posted_date) },
      { label: "NAICS", value: naics },
      { label: "Award", value: award },
    ];
  }, [opportunity]);

  const fullProposalText = useMemo(() => {
    if (sections.length === 0) {
      return proposalText;
    }
    return sections.map((section) => `${section.title}\n${section.content}`).join("\n\n");
  }, [sections, proposalText]);

  const handleGenerate = () => {
    if (!id) {
      return;
    }
    generateMutation.mutate();
  };

  const handleRefine = (section: Section, action: string, instructionOverride?: string) => {
    if (!id) {
      return;
    }
    let instruction = instructionOverride;
    if (action === "edit" && !instruction) {
      instruction = window.prompt("Describe the change you want for this section:", section.content) || undefined;
      if (!instruction) {
        return;
      }
    }

    refineMutation.mutate(
      {
        opportunity_id: id,
        user_profile: loadProfile(),
        section_title: section.title,
        section_text: section.content,
        instruction,
        action,
      },
      {
        onSuccess: (data) => {
          setSections((prev) =>
            prev.map((item) =>
              item.id === section.id
                ? {
                    ...item,
                    content: data.section_text || item.content,
                    citations: data.citations ?? item.citations,
                    status: "review",
                  }
                : item,
            ),
          );
        },
      },
    );
  };

  const handleQuickAction = (actionText: string) => {
    const normalized = actionText.toLowerCase();
    const target = activeSectionData || sections[0];
    if (!target) {
      return;
    }

    if (normalized.startsWith("expand")) {
      handleRefine(target, "expand");
      return;
    }

    handleRefine(target, "edit", actionText);
  };

  const handleChatSend = () => {
    const message = chatInput.trim();
    if (!message || !activeSectionData) {
      return;
    }

    setChatMessages((prev) => [...prev, { role: "user", text: message }]);
    setChatInput("");

    refineMutation.mutate(
      {
        opportunity_id: id as string,
        user_profile: loadProfile(),
        section_title: activeSectionData.title,
        section_text: activeSectionData.content,
        instruction: message,
        action: "edit",
      },
      {
        onSuccess: (data) => {
          setSections((prev) =>
            prev.map((item) =>
              item.id === activeSectionData.id
                ? {
                    ...item,
                    content: data.section_text || item.content,
                    citations: data.citations ?? item.citations,
                    status: "review",
                  }
                : item,
            ),
          );
          setChatMessages((prev) => [
            ...prev,
            { role: "ai", text: `Updated ${activeSectionData.title} based on your instruction.` },
          ]);
        },
        onError: () => {
          setChatMessages((prev) => [
            ...prev,
            { role: "ai", text: "Update failed. Please try again." },
          ]);
        },
      },
    );
  };

  const handleCopy = async (text: string, label: string) => {
    if (!text) {
      toast({ title: "Nothing to copy", description: "Generate a proposal first." });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: `${label} copied to clipboard.` });
    } catch {
      toast({ title: "Copy failed", description: "Please try again." });
    }
  };

  const handleDownload = () => {
    if (!fullProposalText) {
      toast({ title: "Nothing to download", description: "Generate a proposal first." });
      return;
    }
    const html = `<html><head><meta charset="utf-8"></head><body><pre>${escapeHtml(
      fullProposalText,
    )}</pre></body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `proposal-${id ?? "draft"}.doc`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Download started", description: "Exported as a Word-compatible document." });
  };

  const handleMarkAllVerified = () => {
    setSections((prev) => prev.map((section) => ({ ...section, status: "verified" })));
    toast({ title: "All sections verified", description: "You marked the draft as ready." });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_-10%_-20%,rgba(15,118,110,0.12),transparent_55%),radial-gradient(900px_circle_at_110%_-10%,rgba(250,236,220,0.8),transparent_40%)]">
        <AppHeader />

        <div className="mx-auto max-w-[1400px] px-6 py-8 grid gap-6 lg:grid-cols-[300px_1fr_320px]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card/80 shadow-sm p-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Opportunity</p>
                <h2 className="text-lg font-serif mt-2">
                  {oppLoading ? "Loading..." : opportunity?.title || "Proposal Review"}
                </h2>
              </div>

              {oppLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {metadata.map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-3">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{item.label}</span>
                      <span className="text-right text-sm font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/80 shadow-sm p-5 space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Progress</p>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${sections.length ? (reviewedCount / sections.length) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {reviewedCount} of {sections.length} sections verified
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/80 shadow-sm p-5 space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Outline</p>
              <div className="space-y-1.5">
                {sections.length === 0 && (
                  <p className="text-xs text-muted-foreground">No generated sections yet.</p>
                )}
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors duration-150 ${
                      activeSection === section.id
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <StatusIcon status={section.status} />
                    <span className="truncate">{section.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <div className="rounded-2xl border border-border/70 bg-card/80 shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Proposal Review</p>
                  <h1 className="text-2xl font-serif mt-2">
                    {oppLoading ? "Loading opportunity..." : opportunity?.title || "Draft Proposal"}
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${statusStyles}`}>
                      {proposalStatus}
                    </span>
                    <span>
                      {citations.length > 0
                        ? `Grounded in ${citations.length} source${citations.length === 1 ? "" : "s"}`
                        : "No citations returned"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                    Sources
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(fullProposalText, "Full proposal")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Proposal
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5" />
                    Download DOCX
                  </Button>
                  <Button variant="accent" size="sm" onClick={handleGenerate} disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? "Generating..." : "Regenerate Draft"}
                  </Button>
                </div>
              </div>
            </div>

            {oppError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Unable to load opportunity details.
                </div>
                <p className="mt-2 text-muted-foreground">Please refresh or select another opportunity.</p>
              </div>
            )}

            {generateMutation.isPending ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ))}
              </div>
            ) : generationError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Proposal generation failed.
                </div>
                <p className="mt-2 text-muted-foreground">{generationError}</p>
              </div>
            ) : sections.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Click regenerate to create a proposal for this opportunity.
              </div>
            ) : (
              <div className="space-y-6">
                {sections.map((section) => {
                  const rawParagraphs = section.content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
                  const missingMarkers = new Set([
                    "information not provided",
                    "information not provided.",
                    "not provided",
                    "not provided.",
                  ]);
                  const missingLines = rawParagraphs.filter((line) => missingMarkers.has(line.toLowerCase()));
                  const paragraphs = rawParagraphs.filter((line) => !missingMarkers.has(line.toLowerCase()));
                  const showMissing = missingLines.length > 0 || paragraphs.length === 0;
                  return (
                    <motion.div
                      key={section.id}
                      id={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`rounded-2xl border border-border/70 bg-card/80 shadow-sm p-6 transition-all ${
                        activeSection === section.id ? "ring-2 ring-accent/30" : "hover:-translate-y-0.5"
                      }`}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-serif">{section.title}</h2>
                            <span className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                              AI Generated
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <StatusIcon status={section.status} />
                            <span>
                              {section.status === "verified"
                                ? "Verified"
                                : section.status === "flagged"
                                  ? "Flagged"
                                  : "In Review"}
                            </span>
                            <span>•</span>
                            <span>
                              {section.citations?.length
                                ? `${section.citations.length} citations`
                                : "No citations"}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleRefine(section, "regenerate")}
                            disabled={refineMutation.isPending}
                          >
                            <RefreshCcw className="h-3 w-3" />
                            Regenerate
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleRefine(section, "edit")}
                            disabled={refineMutation.isPending}
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleRefine(section, "expand")}
                            disabled={refineMutation.isPending}
                          >
                            <Expand className="h-3 w-3" />
                            Expand
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 text-sm leading-relaxed space-y-3">
                        {showMissing && (
                          <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5" />
                            <div>
                              <p className="font-semibold">Missing Data</p>
                              <p className="text-warning/90">
                                This section could not be fully generated due to incomplete RFP information.
                              </p>
                            </div>
                          </div>
                        )}
                        {paragraphs.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setDrawerOpen(true)}
                          disabled={!section.citations?.length}
                        >
                          View sources
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleCopy(section.content, section.title)}
                        >
                          <Copy className="h-3 w-3" />
                          Copy section
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            setSections((prev) =>
                              prev.map((item) =>
                                item.id === section.id
                                  ? { ...item, status: item.status === "verified" ? "review" : "verified" }
                                  : item,
                              ),
                            )
                          }
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {section.status === "verified" ? "Unverify" : "Mark Verified"}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl border border-border/70 bg-card/80 shadow-sm p-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Final checks before submission. Verify each section and export the draft.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" />
                  Download DOCX
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(fullProposalText, "Full proposal")}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Proposal
                </Button>
                <Button variant="accent" size="sm" onClick={handleMarkAllVerified}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark Verified
                </Button>
              </div>
            </div>
          </main>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Assistant</p>
                  <h2 className="text-sm font-semibold">Proposal Copilot</h2>
                </div>
              </div>

              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {chatMessages.length === 0 ? (
                  <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
                    Ask for changes like "tighten the executive summary" or "add compliance detail."
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors"
                    onClick={() => handleQuickAction(action)}
                  >
                    {action}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                  placeholder="Ask to refine the active section..."
                  className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <Button
                  size="icon"
                  variant="accent"
                  className="h-9 w-9 shrink-0"
                  onClick={handleChatSend}
                  disabled={refineMutation.isPending}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                AI content is grounded in the cited sources and your profile. Always review before submission.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <SourceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} citations={citations} />
    </div>
  );
}
