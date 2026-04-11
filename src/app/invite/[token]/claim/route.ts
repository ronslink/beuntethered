import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/auth";

export async function GET(req: Request, props: { params: Promise<{ token: string }> }) {
  try {
    const params = await props.params;
    const user = await getCurrentUser();
    // Enforce authentication natively before overriding Escrow boundaries
    if (!user) {
      return NextResponse.redirect(new URL(`/invite/${params.token}`, req.url));
    }

    const project = await prisma.project.findUnique({
      where: { invite_token: params.token }
    });

    if (!project || project.status !== "DRAFT" || !project.is_byoc) {
       // Prevent dual-claims mapping to null
       return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Force strict architectural binding securely dropping external dependencies
    await prisma.project.update({
      where: { id: project.id },
      data: {
        client_id: user.id,
        status: "ACTIVE", // Breaks the claim-loop and physically initiates Escrow limits natively
        invite_token: null // Invalidate structural keys permanently
      }
    });

    return NextResponse.redirect(new URL(`/projects/${project.id}`, req.url));
  } catch(e) {
    console.error("BYOC Deep Binding Execution Fault:", e);
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
}
