import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { DEFAULT_PROFILE, loadProfile, saveProfile } from "@/lib/profile";
import { Plus, X, Save } from "lucide-react";

const certifications = ["SDVOSB", "8(a)", "WOSB", "HUBZone", "ISO 9001", "ISO 27001", "CMMC Level 2", "SOC 2"];

const initialPerformance = [
  { id: "1", name: "Cybersecurity Assessment — DoD", agency: "Department of Defense", value: "$1.8M", year: "2024", description: "Comprehensive vulnerability assessment and penetration testing for 12 DoD installations." },
  { id: "2", name: "IT Modernization — VA", agency: "Department of Veterans Affairs", value: "$2.1M", year: "2023", description: "Cloud migration and security architecture review for VA Health systems." },
];

export default function Profile() {
  const storedProfile = useMemo(() => loadProfile(), []);
  const [companyName, setCompanyName] = useState(storedProfile.company_name || DEFAULT_PROFILE.company_name);
  const [capabilitiesText, setCapabilitiesText] = useState(
    (storedProfile.capabilities?.length ? storedProfile.capabilities : DEFAULT_PROFILE.capabilities).join("\n"),
  );
  const [selectedCerts, setSelectedCerts] = useState<string[]>(["SDVOSB", "ISO 9001"]);
  const [performances] = useState(initialPerformance);
  const [naicsCodes, setNaicsCodes] = useState(["541512", "541513", "561612"]);
  const [naicsInput, setNaicsInput] = useState("");

  const toggleCert = (cert: string) => {
    setSelectedCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const addNaics = () => {
    if (naicsInput.trim() && !naicsCodes.includes(naicsInput.trim())) {
      setNaicsCodes((prev) => [...prev, naicsInput.trim()]);
      setNaicsInput("");
    }
  };

  const handleSave = () => {
    const capabilities = capabilitiesText
      .split(/\n|\. /)
      .map((item) => item.trim())
      .filter(Boolean);
    const past_experience = performances.map((perf) => `${perf.name} - ${perf.description}`);

    saveProfile({
      company_name: companyName.trim() || DEFAULT_PROFILE.company_name,
      capabilities: capabilities.length ? capabilities : DEFAULT_PROFILE.capabilities,
      past_experience: past_experience.length ? past_experience : DEFAULT_PROFILE.past_experience,
    });

    toast({
      title: "Profile saved",
      description: "Your proposal profile will be used for new drafts.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Business Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">This data feeds your AI proposal engine.</p>
        </div>

        {/* Business Info */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Business Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Business Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">UEI / DUNS</Label>
              <Input defaultValue="J5EXAMPLE12345" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CAGE Code</Label>
              <Input defaultValue="8ABC9" className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Business Type</Label>
              <Input defaultValue="Service-Disabled Veteran-Owned Small Business" className="bg-background" />
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Capabilities Statement</h2>
          <Textarea
            rows={6}
            value={capabilitiesText}
            onChange={(e) => setCapabilitiesText(e.target.value)}
            className="bg-background text-sm leading-relaxed"
          />
        </section>

        {/* NAICS Codes */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">NAICS Codes</h2>
          <div className="flex flex-wrap gap-2">
            {naicsCodes.map((code) => (
              <span key={code} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">
                {code}
                <button onClick={() => setNaicsCodes((prev) => prev.filter((c) => c !== code))}>
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={naicsInput}
              onChange={(e) => setNaicsInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNaics()}
              placeholder="Add NAICS code"
              className="h-9 bg-background text-xs w-40"
            />
            <Button variant="outline" size="sm" onClick={addNaics}><Plus className="h-3 w-3" /></Button>
          </div>
        </section>

        {/* Past Performance */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Past Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {performances.map((perf) => (
              <div key={perf.id} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <h3 className="text-sm font-semibold">{perf.name}</h3>
                <div className="flex gap-2 text-[11px] text-muted-foreground">
                  <span>{perf.agency}</span>
                  <span>·</span>
                  <span className="tabular-nums">{perf.value}</span>
                  <span>·</span>
                  <span className="tabular-nums">{perf.year}</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{perf.description}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1.5" /> Add Performance</Button>
        </section>

        {/* Certifications */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Certifications</h2>
          <div className="flex flex-wrap gap-2">
            {certifications.map((cert) => (
              <button
                key={cert}
                onClick={() => toggleCert(cert)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                  selectedCerts.includes(cert)
                    ? "bg-accent/20 border-accent/50 text-accent"
                    : "border-border text-muted-foreground hover:border-accent/30"
                }`}
              >
                {cert}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/80 backdrop-blur-md px-6 py-3 flex justify-end z-40">
        <Button variant="accent" size="default" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" /> Save Profile
        </Button>
      </div>
    </div>
  );
}
