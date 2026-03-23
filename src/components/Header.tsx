"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { signInWithGoogle, signOutAction } from "@/actions/auth";

function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-dp-neon/40 rounded-xl text-dp-neon/80 hover:text-dp-neon text-xs font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? (
        <>
          <svg
            className="w-3 h-3 animate-spin flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Signing in…
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in
        </>
      )}
    </button>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-gray-500 hover:text-dp-heart transition-colors px-2 py-1 rounded-lg hover:bg-dp-heart/10 disabled:opacity-60 disabled:cursor-wait flex items-center gap-1"
    >
      {pending ? (
        <>
          <svg
            className="w-3 h-3 animate-spin flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Signing out…
        </>
      ) : (
        "Sign out"
      )}
    </button>
  );
}

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 bg-[#040e16]/80 backdrop-blur-md border-b border-white/5">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo.webp"
          alt="Dehla Pakad"
          width={28}
          height={28}
          unoptimized
          className="rounded-full"
        />
        <div className="flex flex-col leading-none">
          <span className="text-dp-neon text-sm font-bold">Dehla Pakad</span>
          <span className="text-dp-neon/40 text-[9px] font-medium tracking-wider uppercase">
            Catch the 10s
          </span>
        </div>
      </Link>

      {/* Auth */}
      <div className="flex items-center gap-2">
        {status === "loading" ? (
          <div className="h-7 w-20 rounded-xl bg-white/5 animate-pulse" />
        ) : session?.user ? (
          <div className="flex items-center gap-2">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt="avatar"
                width={24}
                height={24}
                unoptimized
                className="rounded-full border border-dp-neon/30"
              />
            )}
            <span className="text-dp-neon text-xs font-semibold hidden sm:block">
              {session.user.name}
            </span>
            <form action={signOutAction}>
              <SignOutButton />
            </form>
          </div>
        ) : (
          <form action={signInWithGoogle}>
            <SignInButton />
          </form>
        )}
      </div>
    </header>
  );
}
