import { PrismaAdapter as NextAuthPrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Establish global prisma to prevent connection pooling limits in Next.js Serverless contexts
const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;
if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export { prisma };

export const authOptions: NextAuthOptions = {
  adapter: NextAuthPrismaAdapter(prisma),
  debug: true,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    // Mock Provider simulating BYOC login flows to bypass magic link verification overhead during DB logic testing
    {
      id: "credentials",
      name: "Credentials",
      type: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        role: { label: "Role (CLIENT/FACILITATOR)", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        
        // Auto-provisioning mock users into database
        let user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              role: credentials.role === "FACILITATOR" ? "FACILITATOR" : "CLIENT",
              name: credentials.email.split('@')[0],
            }
          });
        }
        return user;
      }
    }
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        // Embed the database ID explicitly to currentUser
        (session.user as any).id = token.sub;
        
        // Pull fundamental Stripe references minimizing DB calls in Stripe Escrow Routings
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, stripe_account_id: true, stripe_customer_id: true }
        });
        
        if (dbUser) {
          (session.user as any).role = dbUser.role;
          (session.user as any).stripe_account_id = dbUser.stripe_account_id;
          (session.user as any).stripe_customer_id = dbUser.stripe_customer_id;
        }
      }
      return session;
    }
  }
};
