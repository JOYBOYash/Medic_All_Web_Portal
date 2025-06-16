
"use client";

import { AppLogo } from "@/components/shared/AppLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { LogIn, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }), 
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "patient" ? "patient" : "doctor";
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient'>(initialRole);
  const { login, user, userProfile, loading: authContextLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setSelectedRole(initialRole);
  }, [initialRole]);
  
  useEffect(() => {
    if (!authContextLoading && user && userProfile) {
      // If user is already logged in and profile is loaded, redirect them
      if (userProfile.role === 'doctor') {
        router.replace('/doctor/dashboard');
      } else if (userProfile.role === 'patient') {
        router.replace('/patient/dashboard');
      }
    }
  }, [user, userProfile, authContextLoading, router]);


  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "role_mismatch") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You are not authorized for that role's dashboard. Please log in with the correct account.",
      });
      router.replace('/login', { scroll: false }); // Clear error from URL
    }
  }, [searchParams, toast, router]);


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    const result = await login(data.email, data.password);
    if ('user' in result && result.user) {
      // AuthContext useEffect will fetch profile and redirect if not already done.
      // This is a success, toast a general message, actual redirect handled by context.
      toast({ title: "Login Successful", description: "Redirecting to your dashboard..."});
      // Explicit redirect can be added here as a fallback if context redirection is slow
      // but generally context should handle it.
      // Example:
      // const tempProfile = await getUserProfileDocument(result.user.uid); // this is a direct fetch, context is preferred
      // if (tempProfile?.role === 'doctor') router.push('/doctor/dashboard');
      // else if (tempProfile?.role === 'patient') router.push('/patient/dashboard');
    } else {
      form.setError("root", { message: result.error || "Invalid email or password." });
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: result.error || "Please check your credentials and try again.",
      });
    }
  };
  
  const handleTabChange = (value: string) => {
    const newRole = value as 'doctor' | 'patient';
    setSelectedRole(newRole);
    // Update URL without full page reload, preserving other query params if any
    const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
    currentParams.set('role', newRole);
    router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false });
    form.reset(); 
  }

  if (authContextLoading && !user) { 
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/30 via-background to-accent/30 p-4">
            <AppLogo />
            <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-lg text-primary-foreground_dark">Loading...</p>
        </div>
    );
  }
  // If user is loaded and has profile, they should have been redirected by the useEffect above.
  // This page should only render for non-logged-in users.


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/30 via-background to-accent/30 p-4">
      <div className="mb-8">
        <AppLogo />
      </div>
      <Tabs value={selectedRole} onValueChange={handleTabChange} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="doctor">Doctor Login</TabsTrigger>
          <TabsTrigger value="patient">Patient Login</TabsTrigger>
        </TabsList>
        <TabsContent value="doctor">
          <AuthCard role="doctor" form={form} onSubmit={onSubmit} isSubmitting={form.formState.isSubmitting || authContextLoading} />
        </TabsContent>
        <TabsContent value="patient">
          <AuthCard role="patient" form={form} onSubmit={onSubmit} isSubmitting={form.formState.isSubmitting || authContextLoading} />
        </TabsContent>
      </Tabs>
       <p className="mt-4 text-center text-sm text-muted-foreground">
        New to HomeoConnect?{" "}
        <Link href={`/signup?role=${selectedRole}`} className="underline text-primary hover:text-primary/80">
          Create an account
        </Link>
      </p>
    </div>
  );
}

interface AuthCardProps {
  role: 'doctor' | 'patient';
  form: any; 
  onSubmit: (data: LoginFormValues) => void;
  isSubmitting: boolean;
}

function AuthCard({ role, form, onSubmit, isSubmitting }: AuthCardProps) {
  return (
     <Card className="shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-headline">
            {role === 'doctor' ? "Doctor Login" : "Patient Login"}
          </CardTitle>
          <CardDescription>
            Enter your credentials to access your {role} portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="#" // TODO: Implement forgot password
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
        </CardFooter>
      </Card>
  )
}
