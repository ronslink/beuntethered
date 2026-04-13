import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import ProjectCreationWizard from "./_ProjectCreationWizard";

export default async function ProjectNewPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") redirect("/dashboard");
  return <ProjectCreationWizard />;
}
