
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
import { LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }), // Min 1 for presence check
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "patient" ? "patient" : "doctor";
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient'>(initialRole);
  const { login, userProfile, loading } = useAuth();
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
        description: "You are not authorized for that role's dashboard.",
      });
      // Clear the error from URL
      router.replace('/login', { scroll: false });

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
    if ('user' in result) {
      // AuthContext useEffect will fetch profile and redirect
      // Forcing a check here, though AuthContext should handle it.
      if (userProfile?.role === 'doctor') {
         router.push('/doctor/dashboard');
      } else if (userProfile?.role === 'patient') {
         router.push('/patient/dashboard');
      } else {
        // If profile is still loading, wait or check role from result if available (not in this setup)
        // Fallback in case redirect doesn't happen fast enough from context
        // This part might be tricky due to async nature of profile loading
        setTimeout(() => {
          // Re-check after a delay for profile to load
          if(auth.currentUser) { // auth is from firebase/auth
            // This is just a fallback, the AuthContext effect is preferred
            const expectedPath = selectedRole === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard';
            router.push(expectedPath);
          }
        }, 500);
      }
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
    setSelectedRole(value as 'doctor' | 'patient');
    router.replace(`/login?role=${value}`, { scroll: false });
    form.reset(); // Reset form errors/values
  }

  if (loading && !userProfile) { // Show loading indicator if auth state is being determined
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/30 via-background to-accent/30 p-4">
            <AppLogo />
            <p className="mt-4 text-lg text-primary-foreground_dark">Loading...</p>
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
          <AuthCard role="doctor" form={form} onSubmit={onSubmit} />
        </TabsContent>
        <TabsContent value="patient">
          <AuthCard role="patient" form={form} onSubmit={onSubmit} />
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
  form: any; // react-hook-form useForm return type
  onSubmit: (data: LoginFormValues) => void;
}

function AuthCard({ role, form, onSubmit }: AuthCardProps) {
  const { loading: authLoading } = useAuth();
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
              <Button type="submit" className="w-full" disabled={authLoading || form.formState.isSubmitting}>
                <LogIn className="mr-2 h-4 w-4" />
                {(authLoading || form.formState.isSubmitting) ? "Signing In..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm">
           {/* Placeholder for social login or alternative sign-up options */}
        </CardFooter>
      </Card>
  )
}

