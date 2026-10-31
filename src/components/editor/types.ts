import type { LucideIcon } from 'lucide-react';
import type { PageDoc } from '~/lib/page-schema';

/** The differences between the signed-in editor and browser-only Try mode. */
export type EditorAdapter = {
  mode: 'live' | 'try';
  persist: (doc: PageDoc) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string | null>;
  removeAvatar: () => Promise<void>;
  changeUsername: (username: string) => Promise<string>;
};

export type EditorTab = {
  id: string;
  label: string;
  icon: LucideIcon;
};
