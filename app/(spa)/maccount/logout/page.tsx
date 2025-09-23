import { redirect } from "next/navigation";

export default function LogoutPagePage() {
  redirect("/maccount/signin");
}
