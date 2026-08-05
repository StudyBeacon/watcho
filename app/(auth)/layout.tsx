import type { ReactNode } from "react";
import { Play } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Ambient gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(0, 122, 255, 0.12), transparent 50%), radial-gradient(circle at 80% 80%, rgba(52, 199, 89, 0.08), transparent 50%)",
        }}
      />

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shadow-md">
          <Play size={20} className="text-white fill-white ml-0.5" />
        </div>
        <span className="text-2xl font-semibold tracking-tight text-label">
          WatchTogether
        </span>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-[400px] glass-strong rounded-2xl shadow-lg p-8 animate-scale-in">
        {children}
      </div>
    </div>
  );
}