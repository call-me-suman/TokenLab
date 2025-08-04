import { SessionData, sessionOptions } from "@/lib/session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const page = async () => {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );

  if (!session.isLoggedIn) {
    redirect("/login");
  }
  return <div>page</div>;
};

export default page;
