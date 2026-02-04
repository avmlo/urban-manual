import { redirect } from 'next/navigation';

interface PlacesPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PlacesPage({ params }: PlacesPageProps) {
  const { slug } = await params;

  // Redirect /places/xyz to /destination/xyz
  redirect(`/destination/${slug}`);
}
