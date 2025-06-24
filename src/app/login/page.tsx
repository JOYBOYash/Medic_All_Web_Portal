
"use client";

import { AppLogo } from "@/components/shared/AppLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { LogIn, Loader2 } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }), 
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname(); // Get current pathname
  const initialRole = searchParams.get("role") === "patient" ? "patient" : "doctor";
  const emailFromQuery = searchParams.get("email");
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient'>(initialRole);
  const { login, user, userProfile, loading: authContextLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setSelectedRole(initialRole);
  }, [initialRole]);
  
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "role_mismatch") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You are not authorized for that role's dashboard. Please log in with the correct account.",
      });
      // Use router.replace with only the pathname to remove all query params
      router.replace(pathname, { scroll: false }); 
    }
  }, [searchParams, toast, router, pathname]);


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: emailFromQuery || "",
      password: "",
    },
  });

  // Update email field if emailFromQuery changes and form is initialized
  useEffect(() => {
    if (emailFromQuery) {
      form.setValue("email", emailFromQuery);
    }
  // form.setValue is stable, but searchParams is the trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailFromQuery]);


  const onSubmit = async (data: LoginFormValues) => {
    const result = await login(data.email, data.password);
    if ('user' in result && result.user) {
      toast({ title: "Login Successful", description: "Redirecting to your dashboard..."});
      // Redirection is now handled by AuthContext's onAuthStateChanged and route protection useEffect
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
    const currentParams = new URLSearchParams(Array.from(searchParams.entries()));
    currentParams.set('role', newRole);
    // Preserve email if it exists from signup redirect
    if (!currentParams.has('email') && emailFromQuery) {
        currentParams.set('email', emailFromQuery);
    } else if (!emailFromQuery && currentParams.has('email')) {
        // If emailFromQuery is cleared but still in params from old state, remove it.
    }
    router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false });
    form.reset({ email: emailFromQuery || "", password: "" }); // Reset form, preserving email if from query
  }

  // If AuthContext is loading OR (AuthContext is done loading AND user exists), show loader.
  // The AuthContext will handle redirecting if the user is already logged in.
  // The login form shows only if AuthContext is done AND there's no user.
  if (authContextLoading || (!authContextLoading && user)) { 
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/30 via-background to-accent/30 p-4">
            <AppLogo />
            <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-lg text-primary-foreground_dark">Loading...</p>
        </div>
    );
  }

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
        New to Medicall?{" "}
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
                        href="/forgot-password"
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

function LoginPageSkeleton() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/30 via-background to-accent/30 p-4">
            <AppLogo />
            <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-lg text-primary-foreground_dark">Loading Page...</p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginPageSkeleton />}>
            <LoginContent />
        </Suspense>
    );
}
