import { Mail } from "lucide-react";
import { SITE_CONTACT } from "@/config/site";
import { cn } from "@/lib/utils";
import { WhatsAppLink } from "./whatsapp-link";

/** Brand icons (lucide has none). */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-5", className)}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn("size-5", className)}>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
    </svg>
  );
}

const button =
  "inline-grid size-11 place-items-center rounded-full text-white shadow-soft transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

/** Round icon links to our social profiles, WhatsApp (when configured) and email. */
export function SocialLinks({ className, whatsappMessage }: { className?: string; whatsappMessage?: string }) {
  return (
    <ul className={cn("flex items-center gap-3", className)} aria-label="Follow and contact us">
      <li>
        <a href={SITE_CONTACT.instagram} target="_blank" rel="noopener noreferrer" aria-label="My Travel Memory on Instagram (opens in a new tab)" title="Instagram" className={cn(button, "bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)]")}>
          <InstagramIcon />
        </a>
      </li>
      <li>
        <a href={SITE_CONTACT.youtube} target="_blank" rel="noopener noreferrer" aria-label="My Travel Memory on YouTube (opens in a new tab)" title="YouTube" className={cn(button, "bg-[#FF0000]")}>
          <YouTubeIcon />
        </a>
      </li>
      <li>
        <a href={`mailto:${SITE_CONTACT.supportEmail}`} aria-label={`Email ${SITE_CONTACT.supportEmail}`} title="Email us" className={cn(button, "bg-brand")}>
          <Mail aria-hidden className="size-5" />
        </a>
      </li>
      {whatsappMessage ? (
        <li>
          <WhatsAppLink message={whatsappMessage} />
        </li>
      ) : null}
    </ul>
  );
}

export function SupportEmail({ className }: { className?: string }) {
  return (
    <a href={`mailto:${SITE_CONTACT.supportEmail}`} className={cn("underline underline-offset-2 hover:text-brand", className)}>
      {SITE_CONTACT.supportEmail}
    </a>
  );
}
