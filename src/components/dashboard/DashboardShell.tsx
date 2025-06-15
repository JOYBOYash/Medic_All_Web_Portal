"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "@/components/ui/sidebar"; // Assuming this is the correct path to your Sidebar component
import { MainHeader } from "@/components/shared/MainHeader";
import { AppLogo } from "@/components/shared/AppLogo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "../ui/button";
import { LogOut } from "lucide-react";

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
  pageTitle?: string; // Optional title for the current page content
}

export function DashboardShell({ children, navItems, userRole, pageTitle }: DashboardShellProps) {
  const pathname = usePathname();
  const [openMobile, setOpenMobile] = React.useState(false); // For mobile sidebar

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <Sidebar collapsible="icon" side="left" variant="sidebar" className="border-r bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="h-16 flex items-center justify-between p-4">
            <AppLogo />
            <SidebarTrigger className="hidden group-data-[collapsible=icon]:flex data-[state=closed]:hidden" />
          </SidebarHeader>
          <SidebarContent className="p-2">
            <ScrollArea className="h-[calc(100vh-8rem)]"> {/* Adjust height based on header/footer */}
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href} className="relative">
                    {!item.submenu ? (
                       <Link href={item.href} passHref legacyBehavior>
                        <SidebarMenuButton
                          isActive={pathname === item.href || (item.href !== `/${userRole}/dashboard` && pathname.startsWith(item.href))}
                          tooltip={item.title}
                          className="w-full justify-start"
                        >
                          {item.icon}
                          <span className="truncate">{item.title}</span>
                        </SidebarMenuButton>
                      </Link>
                    ) : (
                      // Placeholder for submenu logic if needed - current sidebar doesn't directly support dropdowns
                      // For simplicity, we'll render submenus as separate items or group them visually
                      <>
                        <SidebarMenuButton
                          isActive={item.submenu.some(sub => pathname === sub.href || pathname.startsWith(sub.href))}
                          tooltip={item.title}
                          className="w-full justify-start"
                          // onClick={() => { /* Toggle submenu */ }}
                        >
                          {item.icon}
                          <span className="truncate">{item.title}</span>
                        </SidebarMenuButton>
                        {/* This sub-menu rendering would need custom logic or a different sidebar component for full interactivity */}
                        <SidebarMenuSub>
                          {item.submenu.map(subItem => (
                            <SidebarMenuSubItem key={subItem.href}>
                               <Link href={subItem.href} passHref legacyBehavior>
                                <SidebarMenuSubButton isActive={pathname === subItem.href}>
                                  {subItem.icon}
                                  <span>{subItem.title}</span>
                                </SidebarMenuSubButton>
                              </Link>
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
            <Button variant="ghost" className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </Button>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex flex-col">
           <MainHeader onMenuClick={() => setOpenMobile(!openMobile)} isMobileSidebarOpen={openMobile} />
           <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background overflow-auto">
              {pageTitle && (
                <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight mb-6 text-primary-foreground_dark">
                  {pageTitle}
                </h1>
              )}
              {children}
           </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
