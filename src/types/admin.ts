export type UserRole = 'owner' | 'editor' | 'viewer' | 'admin' | 'revoked';

export interface AuthorizedUser {
  email: string;
  role: UserRole;
  addedAt?: any;
  addedBy?: string;
  name?: string;
}

export interface FirestoreHymnLyrics {
  coptic: string;
  english: string;
  arabic: string;
}

export interface FirestoreHymn {
  id: string;
  name: string;
  genreIds: string[];
  description?: string;
  subGenreId?: Record<string, string>;
  lyrics: FirestoreHymnLyrics;
  active?: boolean;
  rank?: number;
  updatedAt?: any;
}

export interface FirestoreRecording {
  id: string;
  hymnId: string;
  cantorId: string;
  mode: 'learn' | 'listen';
  audioUrl: string;
  audioLength: number;
  markers: number[];
  lyricsMapping: number[];
  markersUrl?: string;
  lyricsMappingUrl?: string;
  active?: boolean;
  updatedAt?: any;
  updatedBy?: string;
}

export interface FirestoreCantor {
  id: string;
  name: string;
  rank: number;
  active?: boolean;
  cantorCloudActive: boolean;
  photoUrl?: string;
  updatedAt?: any;
}

export interface FirestoreSubgenre {
  id: string;
  name: string;
  hymnIds: string[];
}

export interface FirestoreGenre {
  id: string;
  name: string;
  rank: number;
  description?: string;
  icon?: string;
  backgroundUrl?: string;
  contentUrl?: string;
  content?: string;
  active: boolean;
  cantorCloudActive: boolean;
  subgenres?: FirestoreSubgenre[];
  updatedAt?: any;
}

export type ChangeEntityType = 'markers' | 'lyrics' | 'hymn' | 'season' | 'cantor';

export interface PendingChange {
  id: string;
  entityType: ChangeEntityType;
  entityId: string;
  entityName: string;
  action: 'update' | 'create' | 'reorder';
  summary: string;
  details?: string;
  previousSnapshot: any;
  newSnapshot: any;
  userEmail: string;
  timestamp: string;
  published: boolean;
  publishedAt?: string;
  publishedBy?: string;
  reverted?: boolean;
  revertedAt?: string;
  revertedBy?: string;
}

export interface HymnLockInfo {
  hymnId: string;
  hymnTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  acquiredAt: number;
  lastHeartbeat: number;
  leaseDurationMs: number;
}


