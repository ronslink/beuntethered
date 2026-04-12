"use server";

import { prisma } from "@/lib/auth";
import { hashPassword } from "@/lib/encryption";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function registerUser({
  email,
  password,
  name,
  role,
}: {
  email: string;
  password: string;
  name: string;
  role: "CLIENT" | "FACILITATOR";
}) {
  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    const password_hash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        name: name || email.split("@")[0],
        role,
      },
    });

    revalidatePath("/login");
    return { success: true, userId: user.id };
  } catch (err: any) {
    console.error("Registration error:", err);
    return { success: false, error: err.message };
  }
}
