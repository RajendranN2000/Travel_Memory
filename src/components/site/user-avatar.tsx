import { initialOf } from "@/features/account/avatar";
import { cn } from "@/lib/utils";

export interface AvatarUser {
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

/** The signed-in user's profile photo, or their initial when there isn't one. */
export function UserAvatar({ user, className }: { user: AvatarUser; className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-primary font-display text-base text-primary-foreground",
        className,
      )}
    >
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
        <img src={user.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initialOf(user.displayName, user.email)}</span>
      )}
    </span>
  );
}
