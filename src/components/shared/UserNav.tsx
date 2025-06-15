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
import { LogOut, Settings, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// import { useAuth } from "@/context/AuthContext"; // Placeholder for auth context

export function UserNav() {
  // const { user, logout } = useAuth(); // Placeholder
  const router = useRouter();

  // Placeholder user data
  const user = {
    displayName: "Dr. Smith",
    email: "dr.smith@example.com",
    photoURL: "https://placehold.co/100x100.png",
    role: "doctor", // This would come from your auth state
  };

  const handleLogout = async () => {
    // await logout(); // Placeholder
    alert("Logging out (placeholder)");
    router.push("/login");
  };

  const getProfileLink = () => {
    return user.role === 'doctor' ? '/doctor/profile' : '/patient/profile';
  }

  if (!user) {
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
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} data-ai-hint="profile avatar" />
            <AvatarFallback>
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
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
          <Link href={user.role === 'doctor' ? "/doctor/settings" : "/patient/settings"}>
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
