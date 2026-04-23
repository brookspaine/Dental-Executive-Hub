import { useListOrganizations } from "@workspace/api-client-react";

export const URGENT_DENTAL_ORG = "Urgent Dental";

export type MeetingOrgOption = { value: string; label: string };

export function useMeetingOrgOptions(): {
  options: MeetingOrgOption[];
  isLoading: boolean;
} {
  const { data: orgs = [], isLoading } = useListOrganizations();
  const edgeOrgs = (orgs as any[]).filter(
    (o) => !o.category || o.category === "edge"
  );
  const dsoOrgs = (orgs as any[]).filter((o) => o.category === "edge_dso");
  const options: MeetingOrgOption[] = [
    { value: URGENT_DENTAL_ORG, label: URGENT_DENTAL_ORG },
    ...dsoOrgs.map((o) => ({
      value: `EDGE DSO - ${o.name}`,
      label: `EDGE DSO - ${o.name}`,
    })),
    ...edgeOrgs.map((o) => ({
      value: `EDGE - ${o.name}`,
      label: `EDGE - ${o.name}`,
    })),
  ];
  return { options, isLoading };
}
