
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
  badge?: string;
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
  const { logout } = useAuth();

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
                          isActive={pathname === item.href || (item.href !== `/${userRole}/dashboard` && pathname.startsWith(item.href) && item.href.split('/').length > 2)}
                          tooltip={item.title}
                          className="w-full justify-start"
                        >
                          <Link href={item.href}>
                            {item.icon}
                            <span className="truncate">{item.title}</span>
                             {item.badge && (
                              <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive p-1 text-xs font-medium text-destructive-foreground">
                                {Number(item.badge) > 99 ? '99+' : item.badge}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                    ) : (
                      <>
                        <SidebarMenuButton
                          isActive={item.submenu.some(sub => pathname === sub.href || pathname.startsWith(sub.href))}
                          tooltip={item.title}
                          className="w-full justify-start"
                        >
                          {item.icon}
                          <span className="truncate">{item.title}</span>
                           {item.badge && (
                              <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive p-1 text-xs font-medium text-destructive-foreground">
                                {Number(item.badge) > 99 ? '99+' : item.badge}
                              </span>
                            )}
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          {item.submenu.map(subItem => (
                            <SidebarMenuSubItem key={subItem.href}>
                               <SidebarMenuSubButton 
                                 asChild 
                                 isActive={pathname === subItem.href}
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
           <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background overflow-auto relative">
              {children}
           </main>
        </SidebarInset>
    </SidebarProvider>
  );
}
