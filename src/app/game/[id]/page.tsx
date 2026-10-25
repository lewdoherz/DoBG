import { CollectionApp } from '@/components/collection-app';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CollectionApp gameId={id} />;
}
