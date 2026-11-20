import { CORS, json } from './http.js';
import { createPost, listPosts } from './posts.js';
import { getPhoto } from './photos.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/posts' && request.method === 'GET') return listPosts(url, env);
    if (url.pathname === '/posts' && request.method === 'POST') return createPost(request, url, env);

    const photo = url.pathname.match(/^\/photos\/([0-9a-f-]{36}\.jpg)$/);
    if (photo && request.method === 'GET') return getPhoto(photo[1], env);

    return json({ error: 'Not found' }, 404);
  },
};
