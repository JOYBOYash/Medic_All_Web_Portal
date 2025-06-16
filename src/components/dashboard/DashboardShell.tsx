
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarInset,
} from "@/components/ui/sidebar"; 
import { MainHeader } from "@/components/shared/MainHeader";
import { AppLogo } from "@/components/shared/AppLogo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "../ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  submenu?: NavItem[];
}

interface DashboardShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  userRole: "doctor" | "patient";
  pageTitle?: string; 
}

export function DashboardShell({ children, navItems, userRole, pageTitle }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading: authContextLoading, logout, isPageLoading, setPageLoading } = useAuth(); // Added isPageLoading

  React.useEffect(() => {
    // This effect handles initial auth loading and role checks
    // The page-specific loading will be handled by individual pages setting `isPageLoading`
    if (!authContextLoading) {
      if (!user) {
        setPageLoading(true); // Set loading true before redirect
        router.push("/login");
      } else if (userProfile && userProfile.role !== userRole) {
        setPageLoading(true); // Set loading true before redirect
        logout(); 
        router.push(`/login?error=role_mismatch&expected=${userRole}&actual=${userProfile.role}`);
      }
    }
  }, [user, userProfile, authContextLoading, userRole, router, logout, setPageLoading]);

  // This effect listens to pathname changes to set isPageLoading to true
  // Pages are responsible for setting it to false when their content is loaded
  React.useEffect(() => {
    setPageLoading(true);
    // The new page will set it to false once its data is loaded
    // No explicit false setting here to avoid race conditions with page's own loading logic
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, setPageLoading]);


  if (authContextLoading || !user || !userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (userProfile.role !== userRole) {
    // This case should ideally be caught by the useEffect above and redirect.
    // Showing loader while redirecting.
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Verifying role...</p>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen className="bg-muted/40">
        <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="h-16 flex items-center justify-between p-4">
            <AppLogo />
            <SidebarTrigger className="hidden group-data-[collapsible=icon]:flex data-[state=closed]:hidden" />
          </SidebarHeader>
          <SidebarContent className="p-2">
            <ScrollArea className="h-[calc(100vh-8rem)]"> 
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href} className="relative">
                    {!item.submenu ? (
                        <SidebarMenuButton
                          asChild 
                          isActive={pathname === item.href || (item.href !== `/${userRole}/dashboard` && pathname.startsWith(item.href))}
                          tooltip={item.title}
                          className="w-full justify-start"
                          onClick={() => {
                            if(pathname !== item.href) setPageLoading(true);
                          }}
                        >
                          <Link href={item.href}>
                            {item.icon}
                            <span className="truncate">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                    ) : (
                      <>
                        <SidebarMenuButton
                          isActive={item.submenu.some(sub => pathname === sub.href || pathname.startsWith(sub.href))}
                          tooltip={item.title}
                          className="w-full justify-start"
                          // onClick for parent of submenu might not be needed if it doesn't navigate
                        >
                          {item.icon}
                          <span className="truncate">{item.title}</span>
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          {item.submenu.map(subItem => (
                            <SidebarMenuSubItem key={subItem.href}>
                               <SidebarMenuSubButton 
                                 asChild 
                                 isActive={pathname === subItem.href}
                                 onClick={() => {
                                    if(pathname !== subItem.href) setPageLoading(true);
                                  }}
                               >
                                <Link href={subItem.href}>
                                  {subItem.icon}
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </ScrollArea>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t">
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </Button>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex flex-col">
           <MainHeader /> 
           <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background overflow-auto relative"> {/* Added relative positioning */}
              {isPageLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              )}
              {pageTitle && !isPageLoading && ( // Hide title if page is loading
                <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight mb-6 text-primary-foreground_dark">
                  {pageTitle}
                </h1>
              )}
              {!isPageLoading && children} {/* Render children only if not page loading */}
           </main>
        </SidebarInset>
    </SidebarProvider>
  );
}

