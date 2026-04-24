import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useReportAvatarMap,
  lookupAvatar,
} from "@/lib/report-avatars";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MemberAvatar({
  name,
  className = "",
  fallbackClassName = "text-xs bg-primary/15 text-primary",
}: {
  name: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const map = useReportAvatarMap();
  const url = lookupAvatar(map, name);
  return (
    <Avatar className={className}>
      {url && <AvatarImage src={url} alt={name} />}
      <AvatarFallback className={fallbackClassName}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
