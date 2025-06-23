
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, CalendarHeart, MessageSquareHeart, Stethoscope, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppLogo } from "@/components/shared/AppLogo";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && userProfile) {
      if (userProfile.role === 'doctor') {
        router.replace('/doctor/dashboard');
      } else if (userProfile.role === 'patient') {
        router.replace('/patient/dashboard');
      }
    }
  }, [user, userProfile, loading, router]);

  if (loading || (!loading && user)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-primary/30 via-background to-accent/30">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // If user is loaded and already logged in, they would have been redirected.
  // So, this page is primarily for non-logged-in users.

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <AppLogo />
          <nav className="flex items-center gap-4">
            <Link href="/login?role=patient">
              <Button variant="ghost">Patient Login</Button>
            </Link>
            <Link href="/login?role=doctor">
              <Button variant="default">Doctor Login</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-primary/30 via-background to-accent/30">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary-foreground_dark">
                    Welcome to <span className="text-primary">Medicall</span>
                  </h1>
                  <p className="max-w-[600px] text-foreground md:text-xl">
                    Bridging the gap between practitioners and patients with seamless digital solutions. Manage appointments, prescriptions, and patient communication, all in one place.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/login?role=doctor">
                    <Button size="lg" className="w-full min-[400px]:w-auto">
                      Doctor Portal
                    </Button>
                  </Link>
                  <Link href="/login?role=patient">
                    <Button size="lg" variant="secondary" className="w-full min-[400px]:w-auto">
                      Patient Access
                    </Button>
                  </Link>
                </div>
                 <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                        New user? <Link href="/signup" className="text-primary hover:underline">Sign up here</Link>.
                    </p>
                </div>
              </div>
              <Image
                src="https://images.unsplash.com/photo-1586773860414-72d262e3c393?q=80&w=600&h=400&auto=format&fit=crop"
                alt="A modern and clean clinic interior"
                width={600}
                height={400}
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square shadow-lg"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-headline font-bold tracking-tighter sm:text-5xl">Everything You Need for Modern Patient Care</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Medicall offers a comprehensive suite of tools designed to enhance clinic efficiency and patient experience.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline"><Stethoscope className="text-primary"/> Secure Doctor Portal</CardTitle>
                  <CardDescription>Manage clinic details, patient profiles, and appointments with ease.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <FeatureListItem>Patient Profile Management</FeatureListItem>
                  <FeatureListItem>Appointment Scheduling</FeatureListItem>
                  <FeatureListItem>Digital Prescriptions</FeatureListItem>
                </CardContent>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline"><CalendarHeart className="text-accent"/> Convenient Patient Access</CardTitle>
                  <CardDescription>View medical history, upcoming appointments, and medication reminders.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <FeatureListItem>View Prescriptions</FeatureListItem>
                  <FeatureListItem>Appointment History</FeatureListItem>
                  <FeatureListItem>Medication Reminders</FeatureListItem>
                </CardContent>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline"><MessageSquareHeart className="text-primary"/> Enhanced Communication</CardTitle>
                  <CardDescription>Stay connected with your doctor through secure chat and receive timely updates.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <FeatureListItem>Secure Doctor-Patient Chat</FeatureListItem>
                  <FeatureListItem>Notifications & Alerts</FeatureListItem>
                  <FeatureListItem>Quick Issue Resolution (Chatbot)</FeatureListItem>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Medicall. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4">
            Privacy Policy
          </Link>
        </nav>
      </footer>
    </div>
  );
}

function FeatureListItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle className="h-5 w-5 text-accent" />
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}
