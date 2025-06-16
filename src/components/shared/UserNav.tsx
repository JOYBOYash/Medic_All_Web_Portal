
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, UserCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext"; 
import { Skeleton } from "../ui/skeleton";


export function UserNav() {
  const { user, userProfile, logout, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const getProfileLink = () => {
    if (!userProfile) return "#";
    return userProfile.role === 'doctor' ? '/doctor/profile' : '/patient/profile';
  }
  const getSettingsLink = () => {
    if (!userProfile) return "#";
    return userProfile.role === 'doctor' ? '/doctor/settings' : '/patient/settings';
  }


  if (loading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  if (!user || !userProfile) {
    return (
      <Link href="/login">
        <Button variant="outline">Login</Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userProfile.photoURL || undefined} alt={userProfile.displayName || "User"} data-ai-hint="profile avatar" />
            <AvatarFallback>
              {userProfile.displayName ? userProfile.displayName.charAt(0).toUpperCase() : <UserCircle />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userProfile.displayName || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userProfile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href={getProfileLink()}>
            <DropdownMenuItem>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>
          <Link href={getSettingsLink()}>
             <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

