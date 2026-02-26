export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Document detail page — {id}</p>
    </div>
  );
}
