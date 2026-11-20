import { CORS } from './http.js';

export async function getPhoto(key, env) {
  const object = await env.PHOTOS.get(key);
  if (!object) return new Response('Not found', { status: 404, headers: CORS });
  return new Response(object.body, {
    headers: {
      ...CORS,
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: object.httpEtag,
    },
  });
}
