export interface PreviewMeta {
  title: string;
  description: string;
  image: string;
  url: string;
}

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const TAGS: Record<string, keyof PreviewMeta> = {
  'og:title': 'title',
  'twitter:title': 'title',
  'og:description': 'description',
  'twitter:description': 'description',
  'og:image': 'image',
  'twitter:image': 'image',
};

/** Rewrites the preview tags already in index.html and adds og:url. */
export const injectPreviewMeta = (html: string, meta: PreviewMeta): string => {
  const replaced = html.replace(
    /(<meta\s+(?:property|name)="([\w:]+)"\s+content=")[^"]*(")/g,
    (match, start: string, tag: string, end: string) =>
      TAGS[tag] ? `${start}${escapeAttr(meta[TAGS[tag]])}${end}` : match
  );
  return replaced.replace(
    '</head>',
    `  <meta property="og:url" content="${escapeAttr(meta.url)}" />\n  </head>`
  );
};

/** `/game/en-es-pt/<id>` or legacy `/game/<id>` → game id. */
export const gameIdFromPath = (path: string): string | null => {
  const match = path.match(/^\/game\/(?:[a-z]{2}(?:-[a-z]{2})+\/)?([A-Za-z0-9]{16,64})\/?$/i);
  return match ? match[1] : null;
};

/** `/og/<uid>/<gameId>.png` → ids. */
export const imageIdsFromPath = (path: string): { uid: string; gameId: string } | null => {
  const match = path.match(/^\/og\/([A-Za-z0-9]{1,128})\/([A-Za-z0-9]{16,64})\.png$/);
  return match ? { uid: match[1], gameId: match[2] } : null;
};

export const isValidUid = (uid: string) => /^[A-Za-z0-9]{1,128}$/.test(uid);
