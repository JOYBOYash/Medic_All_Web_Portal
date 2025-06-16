
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
import { UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const signupSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "patient" ? "patient" : "doctor";
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient'>(initialRole);
  const { signup } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setSelectedRole(initialRole);
  }, [initialRole]);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    const result = await signup(data.email, data.password, selectedRole, data.displayName);
    if ('user' in result) {
      toast({
        title: "Signup Successful!",
        description: "You can now log in.",
      });
      router.push(`/login?role=${selectedRole}`);
    } else {
      form.setError("root", { message: result.error || "An unknown error occurred during signup." });
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: result.error || "Please check your details and try again.",
      });
    }
  };
  
  const handleTabChange = (value: string) => {
    setSelectedRole(value as 'doctor' | 'patient');
    router.replace(`/signup?role=${value}`, { scroll: false });
    form.reset(); // Reset form when tab changes
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/30 via-background to-accent/30 p-4">
      <div className="mb-8">
        <AppLogo />
      </div>
      <Tabs value={selectedRole} onValueChange={handleTabChange} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="doctor">Doctor Signup</TabsTrigger>
          <TabsTrigger value="patient">Patient Signup</TabsTrigger>
        </TabsList>
        <TabsContent value="doctor">
          <AuthCard role="doctor" form={form} onSubmit={onSubmit} />
        </TabsContent>
        <TabsContent value="patient">
          <AuthCard role="patient" form={form} onSubmit={onSubmit} />
        </TabsContent>
      </Tabs>
       <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login?role=${selectedRole}`} className="underline text-primary hover:text-primary/80">
          Log In
        </Link>
      </p>
    </div>
  );
}

interface AuthCardProps {
  role: 'doctor' | 'patient';
  form: any; // react-hook-form useForm return type
  onSubmit: (data: SignupFormValues) => void;
}

function AuthCard({ role, form, onSubmit }: AuthCardProps) {
  return (
     <Card className="shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-headline">
            Create {role === 'doctor' ? "Doctor" : "Patient"} Account
          </CardTitle>
          <CardDescription>
            Enter your details to create your {role} account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name / Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder={role === 'doctor' ? "Dr. John Doe" : "Jane Doe"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
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
                <UserPlus className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
  )
}

