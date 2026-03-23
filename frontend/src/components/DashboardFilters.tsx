import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

const setAsideTypes = ["SDVOSB", "8(a)", "WOSB", "HUBZone", "Small Business"];

export function DashboardFilters() {
  const [contractValue, setContractValue] = useState([0]);

  return (
    <aside className="w-full space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Filters</h2>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Agency</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search agency..." className="pl-8 h-9 text-xs bg-background" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">NAICS Code</Label>
        <Input placeholder="e.g. 541512" className="h-9 text-xs bg-background" />
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Set-Aside Type</Label>
        {setAsideTypes.map((type) => (
          <div key={type} className="flex items-center gap-2">
            <Checkbox id={type} />
            <label htmlFor={type} className="text-xs cursor-pointer">{type}</label>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">
          Contract Value: ${contractValue[0] >= 10 ? "10M+" : `${contractValue[0]}M`}
        </Label>
        <Slider
          value={contractValue}
          onValueChange={setContractValue}
          max={10}
          step={0.5}
          className="py-2"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>$0</span>
          <span>$10M+</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Response Deadline</Label>
        <Input type="date" className="h-9 text-xs bg-background" />
      </div>
    </aside>
  );
}
