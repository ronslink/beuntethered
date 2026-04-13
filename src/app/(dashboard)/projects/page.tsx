import { redirect } from "next/navigation";

export default function ProjectsPage() {
  // Projects feed is rendered directly on the client dashboard page
  redirect("/dashboard");
}
