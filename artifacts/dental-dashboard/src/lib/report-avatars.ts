import { useMemo } from "react";
import { useListDirectReports } from "@workspace/api-client-react";
import { resolveAvatarUrl } from "@/components/editable-report-photo";

export function useReportAvatarMap(): Map<string, string> {
  const { data } = useListDirectReports();
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const r of (data ?? []) as any[]) {
      const url = resolveAvatarUrl(r.avatarUrl);
      if (url && r.name) map.set(r.name.trim().toLowerCase(), url);
    }
    return map;
  }, [data]);
}

export function lookupAvatar(
  map: Map<string, string>,
  name?: string | null,
): string | null {
  if (!name) return null;
  return map.get(name.trim().toLowerCase()) ?? null;
}
