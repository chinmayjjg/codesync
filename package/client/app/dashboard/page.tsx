import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import CreateProject from "./CreateProject";

export default async function Dashboard() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <p>Welcome, {session.user?.email}</p>
      <CreateProject />
    </div>
  );
}