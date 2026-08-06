"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });

        if (error) {
          console.error("Signup error:", error);
          throw error;
        }

        console.log("Signup success:", data);

        if (!data.session) {
          setError("Account created! Please check your email to confirm.");
          return;
        }

        // Create profile manually
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              username: username || email.split("@")[0],
            })
            .select()
            .single();

          if (profileError && profileError.code !== "23505") {
            console.error("Profile creation error:", profileError);
          }
        }

        router.push("/servers");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Login error:", error);
          throw error;
        }

        console.log("Login success:", data);
        router.push("/servers");
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      console.error("Auth error:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-label">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-[14px] text-label-secondary mt-1">
          {isSignup
            ? "Join your friends for movie nights and watch parties."
            : "Sign in to continue to your watch parties."}
        </p>
      </div>

      {isSignup && (
        <Input
          label="Username"
          name="username"
          type="text"
          placeholder="moviebuff42"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={20}
        />
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Input
        label="Password"
        name="password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />

      {error && (
        <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3">
          <p className="text-[13px] text-error">{error}</p>
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full mt-2">
        {isSignup ? "Create Account" : "Sign In"}
      </Button>

      <p className="text-center text-[14px] text-label-secondary mt-2">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="text-accent hover:text-accent-hover font-medium"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
}