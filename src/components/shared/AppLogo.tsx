
import Link from 'next/link';
import { HeartPulse } from 'lucide-react'; // Example icon, can be changed

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className }: AppLogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 text-primary hover:opacity-80 transition-opacity ${className}`}>
      <HeartPulse className="h-8 w-8" />
      <span className="text-2xl font-headline font-bold">Medicall</span>
    </Link>
  );
}
