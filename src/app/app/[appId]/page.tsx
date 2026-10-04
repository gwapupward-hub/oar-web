import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppCard } from '@/components/AppCard';
import { TRUSTED_ISSUERS } from '@/lib/config';
import { getApp } from '@/lib/explorer';

export const maxDuration = 60;
type Props = { params: Promise<{ appId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const app = await getApp((await params).appId);
  return { title: app ? (app.unverified ? `Unverified ${app.title}` : app.title) : 'Not found' };
}

export default async function AppPage({ params }: Props) {
  const app = await getApp((await params).appId);
  if (!app) notFound();
  return <AppCard app={app} trustedIssuers={TRUSTED_ISSUERS.length} />;
}
