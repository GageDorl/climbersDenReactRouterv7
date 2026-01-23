import type { Route } from "./+types/auth.logout";
import { redirect } from "react-router";
import { logout } from "~/lib/auth.server";

export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

export async function loader() {
  return redirect("/");
}
