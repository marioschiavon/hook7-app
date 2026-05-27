import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserMenu } from "./UserMenu";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/50 bg-background/60 backdrop-blur-xl px-4 transition-all">
      <SidebarTrigger className="-ml-1" />
      <div className="flex-1 flex items-center gap-2">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-md" />
          <img
            src="/hook7-logo.svg"
            alt="Hook7"
            className="h-9 w-9 rounded-full relative object-contain drop-shadow-md"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/hook7-logo.svg";
            }}
          />
        </div>
        <h1 className="text-xl font-bold font-['Space_Grotesk'] hook7-gradient-text tracking-tight">
          Hook7
        </h1>
      </div>
      <UserMenu />
    </header>
  );
}
