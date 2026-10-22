import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
export const { auth: middleware } = NextAuth(authConfig);
export const config = {
  runtime: "nodejs",
  // Import authenticates by bearer key; opposition authenticates by signed token.
  matcher: [
    "/((?!api/auth|api/email-drafts$|email-unsubscribe/|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
