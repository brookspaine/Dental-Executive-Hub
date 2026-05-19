import { useLocation, useSearch } from "wouter";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { LeaseMatrix } from "@/pages/lease-matrix";
import LeaseToolkit from "@/pages/lease-toolkit";

type OrgTab = "lease-matrix" | "lease-toolkit";

function parseTab(search: string): OrgTab {
  const params = new URLSearchParams(search);
  return params.get("tab") === "lease-toolkit" ? "lease-toolkit" : "lease-matrix";
}

export function Organizations() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const activeTab = parseTab(search);
  const setActiveTab = (next: OrgTab) => {
    setLocation(`/organizations?tab=${next}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#0F2A47]">EDGE</h1>
        <p className="text-sm text-slate-500">
          Lease tracking across every EDGE and Urgent Dental location.
        </p>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as OrgTab)}
      >
        <TabsList>
          <TabsTrigger value="lease-matrix">Lease Matrix</TabsTrigger>
          <TabsTrigger value="lease-toolkit">Lease Toolkit</TabsTrigger>
        </TabsList>
        <TabsContent value="lease-matrix" className="mt-4">
          <LeaseMatrix />
        </TabsContent>
        <TabsContent value="lease-toolkit" className="mt-4">
          <LeaseToolkit />
        </TabsContent>
      </Tabs>
    </div>
  );
}
