import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import CategoryPageClient from './page-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const categoryName = category.split('-').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');

  return {
    title: `${categoryName} - Urban Manual`,
    description: `Discover the best ${categoryName.toLowerCase()} destinations around the world. Handpicked recommendations for your next trip.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return <CategoryPageClient category={category} />;
}

