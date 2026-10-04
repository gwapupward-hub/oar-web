import { Box, FolderGit2, Globe } from 'lucide-react';
import type { ChipKind } from '@/lib/display';

const ICONS = { program: Box, domain: Globe, repository: FolderGit2 } as const;
export const KIND_NAME: Record<ChipKind, string> = { program: 'Program', domain: 'Domain', repository: 'Repository' };

export function KindIcon({ kind, size = 18 }: { kind: ChipKind; size?: number }) {
  const Icon = ICONS[kind];
  return <Icon size={size} aria-hidden="true" />;
}
