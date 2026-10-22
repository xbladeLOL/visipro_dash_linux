import type { NextAuthConfig } from "next-auth";
// Shared JWT/session configuration; safe to import from the Edge middleware.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
