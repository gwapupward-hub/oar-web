import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppDetail } from '@/components/AppDetail';
import { TRUSTED_ISSUERS } from '@/lib/config';
import { getApp } from '@/lib/explorer';
import { appMetadata } from '@/lib/seo';

export const maxDuration = 60;
type Props = { params: Promise<{ appId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { appId } = await params;
  return appMetadata(appId, await getApp(appId));
}

export default async function AppPage({ params }: Props) {
  const app = await getApp((await params).appId);
  if (!app) notFound();
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Explorer</Link> <span aria-hidden="true">/</span> <span>App</span>
      </nav>
      <AppDetail app={app} trustedIssuers={TRUSTED_ISSUERS.length} />
    </>
  );
}
