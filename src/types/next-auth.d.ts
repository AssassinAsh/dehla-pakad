// Augment NextAuth types to include `id`, `role` on session.user
// and `role` on the database User model.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "player";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "admin" | "player";
  }
}
