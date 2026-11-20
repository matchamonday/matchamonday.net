import { json } from './http.js';
import { moderate } from './moderate.js';

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const MAX_NAME_LENGTH = 40;
const PAGE_SIZE = 24;
const CHAPTERS = ['syd', 'nyc', 'sf', 'other'];

export async function listPosts(url, env) {
  const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
  const { results } = await env.DB.prepare(
    'SELECT id, name, chapter, photo, created_at FROM posts WHERE id < ? ORDER BY id DESC LIMIT ?',
  ).bind(before, PAGE_SIZE).all();

  return json({
    posts: results.map((post) => toJSON(post, url)),
    next: results.length === PAGE_SIZE ? results[results.length - 1].id : null,
  });
}

export async function createPost(request, url, env) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.UPLOADS.limit({ key: ip });
  if (!success) return json({ error: 'Too many uploads. Try again in a minute.' }, 429);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Send a name and a photo.' }, 400);
  }

  const name = String(form.get('name') ?? '').replace(/\s+/g, ' ').trim();
  const chapter = form.get('chapter');
  const file = form.get('photo');
  if (!CHAPTERS.includes(chapter)) return json({ error: 'Pick your chapter.' }, 400);
  if (!name || name.length > MAX_NAME_LENGTH) {
    return json({ error: `Your name must be 1 to ${MAX_NAME_LENGTH} characters.` }, 400);
  }
  if (!(file instanceof File) || file.size > MAX_PHOTO_BYTES) {
    return json({ error: 'Add a photo under 4 MB.' }, 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return json({ error: 'Photos must be JPEG.' }, 400);
  }

  let verdict;
  try {
    verdict = await moderate(env, name, bytes);
  } catch (error) {
    console.error('Moderation check failed', error);
    return json({ error: "We couldn't check your photo. Try again." }, 502);
  }
  if (!verdict.ok) return json({ error: verdict.error }, 422);

  const photo = `${crypto.randomUUID()}.jpg`;
  await env.PHOTOS.put(photo, bytes, { httpMetadata: { contentType: 'image/jpeg' } });
  const post = await env.DB.prepare(
    'INSERT INTO posts (name, chapter, photo) VALUES (?, ?, ?) RETURNING id, name, chapter, photo, created_at',
  ).bind(name, chapter, photo).first();

  return json({ post: toJSON(post, url) }, 201);
}

function toJSON(post, url) {
  return {
    id: post.id,
    name: post.name,
    chapter: post.chapter,
    photo_url: `${url.origin}/photos/${post.photo}`,
    created_at: post.created_at,
  };
}
