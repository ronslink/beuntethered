import { PrismaAdapter as NextAuthPrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { verifyPassword } from "@/lib/encryption";

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
  debug: process.env.NODE_ENV !== "production",
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),

    // Email + Password credentials provider
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password_hash) {
          // No user found or user signed up via OAuth (no password set)
          return null;
        }

        const valid = await verifyPassword(
          credentials.password,
          user.password_hash
        );

        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
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
        (session.user as any).id = token.sub;

        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: {
            role: true,
            stripe_account_id: true,
            stripe_customer_id: true,
          },
        });

        if (dbUser) {
          (session.user as any).role = dbUser.role;
          (session.user as any).stripe_account_id = dbUser.stripe_account_id;
          (session.user as any).stripe_customer_id = dbUser.stripe_customer_id;
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    newUser: "/register",
  },
};
