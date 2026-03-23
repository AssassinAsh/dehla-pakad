import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required when deployed behind a reverse proxy or custom domain (e.g. DO App Platform)
  trustHost: true,

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
