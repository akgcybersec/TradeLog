import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ChangeCredentialsForm } from "./ChangeCredentialsForm";

export default async function ChangeCredentialsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <ChangeCredentialsForm currentName={user.name ?? ""} />;
}
