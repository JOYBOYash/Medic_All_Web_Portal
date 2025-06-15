"use client";

import { AppLogo } from "@/components/shared/AppLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { LogIn } from "lucide-react";
import { useEffect, useState } from "react";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "patient" ? "patient" : "doctor";
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient'>(initialRole);

  useEffect(() => {
    setSelectedRole(initialRole);
  }, [initialRole]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    console.log("Login attempt:", data, "as", selectedRole);
    // Placeholder for Firebase login logic
    // try {
    //   await signInWithEmailAndPassword(auth, data.email, data.password);
    //   // Store role or fetch from user profile after login
    //   if (selectedRole === 'doctor') {
    //     router.push('/doctor/dashboard');
    //   } else {
    //     router.push('/patient/dashboard');
    //   }
    // } catch (error) {
    //   console.error("Login failed:", error);
    //   form.setError("root", { message: "Invalid email or password." });
    // }
    alert(`Login submitted for ${selectedRole} (placeholder):\nEmail: ${data.email}`);
    if (selectedRole === 'doctor') {
        router.push('/doctor/dashboard');
      } else {
        router.push('/patient/dashboard');
      }
  };
  
  const handleTabChange = (value: string) => {
    setSelectedRole(value as 'doctor' | 'patient');
    router.replace(`/login?role=${value}`, { scroll: false });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/30 via-background to-accent/30 p-4">
      <div className="mb-8">
        <AppLogo />
      </div>
      <Tabs value={selectedRole} onValueChange={handleTabChange} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="doctor">Doctor</TabsTrigger>
          <TabsTrigger value="patient">Patient</TabsTrigger>
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
        <Link href="#" className="underline text-primary hover:text-primary/80">
          Contact support to get started.
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
                        href="#"
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                <LogIn className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Signing In..." : "Sign In"}
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
