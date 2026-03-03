import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";
import CreateProject from "./CreateProject";
import EditorClient from "./EditorClient";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <p>Welcome, {session.user?.email}</p>
      <CreateProject />
      <EditorClient />
    </div>
  );
}