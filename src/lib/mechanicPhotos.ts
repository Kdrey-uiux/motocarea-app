import { useEffect, useState } from 'react';
import { db } from './supabase';

/**
 * Mechanic photos (migration 28). The bucket is private: photos open only through
 * short-lived signed links. The owner uploads; staff see every photo; a rider sees
 * only the photo of the mechanic on one of their own tickets.
 */
export const MECHANIC_PHOTO_BUCKET = 'mechanic-photos';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// What the owner may pick (the photo is shrunk before upload, so big phone photos are fine)
const MAX_PICK_BYTES = 15 * 1024 * 1024;
const PHOTO_SIZE = 400;
const LINK_SECONDS = 60 * 60;

/**
 * Square, 400 px, re-drawn on a canvas. Re-drawing also drops hidden photo details
 * (GPS location, camera info), so none of that is uploaded.
 */
export async function prepareMechanicPhoto(file: File): Promise<Blob> {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Use a JPG, PNG or WebP photo.');
  if (file.size > MAX_PICK_BYTES) throw new Error('That photo is too big. Pick one under 15 MB.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('That photo could not be opened. Try another one.');
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(PHOTO_SIZE, side);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('This browser could not prepare the photo.');
  }
  // Centre crop to a square
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob('image/webp', 0.85);
  // Older Safari can't make WebP and hands back a PNG instead
  if (!blob || blob.type !== 'image/webp') blob = await toBlob('image/jpeg', 0.88);
  if (!blob) throw new Error('This browser could not prepare the photo.');
  return blob;
}

/** Uploads a prepared photo into the mechanic's own folder. Returns the stored path. */
export async function uploadMechanicPhoto(mechanicId: string, photo: Blob): Promise<string> {
  const ext = photo.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${mechanicId}/${Date.now()}.${ext}`;
  const { error } = await db()
    .storage.from(MECHANIC_PHOTO_BUCKET)
    .upload(path, photo, { contentType: photo.type, cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Removes a photo file. A failure only leaves an unused file behind, so it is not an error. */
export async function deleteMechanicPhoto(path: string | null | undefined): Promise<void> {
  if (!path) return;
  const { error } = await db().storage.from(MECHANIC_PHOTO_BUCKET).remove([path]);
  if (error) console.warn('Old mechanic photo was not removed:', error.message);
}

// Signed links last an hour; reuse them for a bit less than that
const linkCache = new Map<string, { url: string; until: number }>();

function cachedLink(path: string): string | null {
  const hit = linkCache.get(path);
  return hit && hit.until > Date.now() ? hit.url : null;
}

async function signedLinks(paths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const missing: string[] = [];
  for (const p of new Set(paths)) {
    const hit = cachedLink(p);
    if (hit) result.set(p, hit);
    else missing.push(p);
  }
  if (missing.length > 0) {
    const { data, error } = await db().storage.from(MECHANIC_PHOTO_BUCKET).createSignedUrls(missing, LINK_SECONDS);
    if (!error) {
      for (const row of data || []) {
        if (!row.path || !row.signedUrl) continue;
        linkCache.set(row.path, { url: row.signedUrl, until: Date.now() + (LINK_SECONDS - 300) * 1000 });
        result.set(row.path, row.signedUrl);
      }
    }
  }
  return result;
}

/** Workshop screens: a signed link for one stored photo (null while loading or when there is none) */
export function useMechanicPhotoUrl(path: string | null | undefined): string | null {
  const [state, setState] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!path || cachedLink(path)) return;
    let alive = true;
    signedLinks([path]).then((links) => {
      if (alive) setState({ path, url: links.get(path) ?? null });
    });
    return () => {
      alive = false;
    };
  }, [path]);
  if (!path) return null;
  return cachedLink(path) ?? (state?.path === path ? state.url : null);
}

/** A refreshKey for useMyMechanicPhotos: changes when a ticket or its mechanic changes */
export function mechanicPhotoKey(tickets: { id: string; assigned_mechanic?: string | null }[]): string {
  return tickets.map((t) => `${t.id}:${t.assigned_mechanic || ''}`).join('|');
}

/**
 * Rider screens: photo links by ticket id, for the signed-in rider's own tickets.
 * `refreshKey` should change when the tickets or their mechanics change.
 * Without migration 28 (or with no photos) the map is just empty and names show as before.
 */
export function useMyMechanicPhotos(refreshKey: string): Map<string, string> {
  const [photos, setPhotos] = useState<Map<string, string>>(() => new Map());
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await db().rpc('my_mechanic_photos');
      if (error || !Array.isArray(data)) return;
      const rows = (data as { ticket_id: string; photo_path: string | null }[]).filter((r) => r.ticket_id && r.photo_path);
      const links = rows.length ? await signedLinks(rows.map((r) => r.photo_path as string)) : new Map<string, string>();
      if (!alive) return;
      const next = new Map<string, string>();
      for (const r of rows) {
        const url = links.get(r.photo_path as string);
        if (url) next.set(r.ticket_id, url);
      }
      setPhotos(next);
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey]);
  return photos;
}
