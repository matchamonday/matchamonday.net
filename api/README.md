# Matcha feed

The Cloudflare Worker behind the Matcha feed on the home page, served at `https://api.matchamonday.net`.

- **R2** (`matchamonday-feed` bucket) stores the photos.
- **D1** (`matchamonday-feed` database) stores the posts.
- **Workers AI** runs [Clef-flash](https://developers.cloudflare.com/ai/models/@cf/cloudflare/clef-flash/) on every upload, within the free 10,000 neurons a day (about 5 per upload). It checks that the photo shows matcha, that it is safe to show, that no one's face is in it, and that the name is acceptable. Thresholds are in `src/moderate.js`.
- A rate limiter allows 5 uploads per minute per IP.

## Removing a post

```sh
npx wrangler d1 execute matchamonday-feed --remote --command "SELECT id, name, photo FROM posts ORDER BY id DESC LIMIT 20"
npx wrangler d1 execute matchamonday-feed --remote --command "DELETE FROM posts WHERE id = 123"
npx wrangler r2 object delete matchamonday-feed/<photo> --remote
```
