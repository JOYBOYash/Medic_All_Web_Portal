import { AppLogo } from "./AppLogo";
import { UserNav } from "./UserNav";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Menu } from "lucide-react";

interface MainHeaderProps {
  onMenuClick?: () => void; // For mobile sidebar toggle
  isMobileSidebarOpen?: boolean;
}


export function MainHeader({ onMenuClick, isMobileSidebarOpen }: MainHeaderProps) {
  // const { user } = useAuth(); // Placeholder for auth context
  const user = { role: 'doctor' }; // Placeholder

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {user && onMenuClick && ( // Show menu toggle only if logged in and handler is provided
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden"
              aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
            >
              <Menu className="h-6 w-6" />
            </Button>
          )}
          <AppLogo />
        </div>
        
        <div className="flex items-center gap-4">
          {/* Navigation links can go here if needed, e.g., for unauthenticated users */}
          {/* {!user && (
            <nav className="hidden md:flex gap-4">
              <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-primary">Features</Link>
              <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary">Pricing</Link>
            </nav>
          )} */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
