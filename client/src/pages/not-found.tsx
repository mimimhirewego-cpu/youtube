import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <p className="font-medium">This page doesn't exist.</p>
      <Link href="/" className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
        <Home size={16} /> Back home
      </Link>
    </div>
  );
}
