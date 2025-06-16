
"use client";

import { AppLogo } from "./AppLogo";
import { UserNav } from "./UserNav";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar"; // Import useSidebar

export function MainHeader() {
  const { isMobile, toggleSidebar, openMobile } = useSidebar(); // Use the hook

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {isMobile && ( // Show menu toggle only if on mobile
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar} // Use toggleSidebar from the hook
              className="md:hidden" // Standard practice to hide on larger screens
              aria-label={openMobile ? "Close menu" : "Open menu"}
            >
              <Menu className="h-6 w-6" />
            </Button>
          )}
          <div className={`${isMobile ? "" : "hidden md:flex"}`}> {/* AppLogo might be part of mobile drawer trigger */}
            <AppLogo />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
