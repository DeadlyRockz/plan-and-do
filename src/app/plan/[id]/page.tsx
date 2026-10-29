import { PlanView } from "@/features/plan/plan-view";

export const metadata = { title: "Your plan" };

export default async function PlanPage({ params }: PageProps<"/plan/[id]">) {
  const { id } = await params;
  return <PlanView id={id} />;
}
