import { FieldJobDetail } from "@/components/field";

export default async function FieldJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FieldJobDetail jobId={id} />;
}
