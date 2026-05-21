import { redirect } from "next/navigation";

export default function AlisadoGuideRedirectPage() {
  redirect("/tratamientos?guia=alisado");
}
