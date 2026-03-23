import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required when deployed behind a reverse proxy or custom domain (e.g. DO App Platform)
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,

  // Suppress the expected double-callback noise from Turbopack's dev-mode double-invocation.
  // Login works on the first call; the second call fails with invalid_grant (code already used).
  // This is a dev-only artifact and does not occur in production.
  logger: {
    error: (error) => {
      // Suppress only the expected dev double-callback noise
      if (
        process.env.NODE_ENV === "development" &&
        (error as { type?: string })?.type === "CallbackRouteError"
      ) {
        // Still log the underlying cause so we can debug
        const cause = (error as { cause?: unknown })?.cause;
        if (
          cause &&
          (cause as { message?: string })?.message?.includes("invalid_grant")
        )
          return;
        console.error("[auth][callback-error-cause]", cause);
        return;
      }
      console.error("[auth][error]", JSON.stringify(error, null, 2));
    },
  },

  pages: {
    error: "/", // Redirect auth errors to home instead of crashing /api/auth/error
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  adapter: MongoDBAdapter(clientPromise),

  // Database sessions (required when using adapter)
  session: { strategy: "database" },

  callbacks: {
    async session({ session, user }) {
      // Expose DB id and role to the client session
      if (user) {
        session.user.id = user.id;
        session.user.role =
          (user as { role?: "admin" | "player" }).role ?? "player";
      }
      return session;
    },
  },

  events: {
    // Set default role = "player" the first time a user signs in
    async createUser({ user }) {
      try {
        const client = await clientPromise;
        const db = client.db();
        await db
          .collection("users")
          .updateOne(
            { _id: new ObjectId(user.id!) },
            { $set: { role: "player" } },
          );
      } catch (err) {
        console.error("Failed to set default role for new user:", err);
      }
    },
  },
});
