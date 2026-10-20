/** Re-mounts on every navigation, so each page eases in. */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">{children}</div>;
}
