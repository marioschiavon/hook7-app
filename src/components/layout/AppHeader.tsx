import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserMenu } from "./UserMenu";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex-1 flex items-center gap-2">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-md" />
          <img
            src="/hook7-logo.svg"
            alt="Hook7"
            className="h-8 w-8 rounded-full relative"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/hook7-logo.svg";
            }}
          />
        </div>
        <h1 className="text-lg font-bold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent">
          Hook7
        </h1>
      </div>
      <UserMenu />
    </header>
  );
}
