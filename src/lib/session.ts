import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * Standard utility to securely extract the validated `currentUser` 
 * inside Edge configurations or dynamic Stripe API Routing handlers.
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user as any;
}
