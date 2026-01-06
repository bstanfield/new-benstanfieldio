# benstanfield.io

A minimal personal website with a GitHub-powered blog editor, deployed on Vercel.

## Overview

This site consists of:
- **Landing page** (`index.html`) - Bio, bookshelf, and blog post list
- **Blog posts** (`/writing/*`) - Server-side rendered for SEO and social sharing
- **Editor** (`editor.html`) - Notion-like markdown editor for creating/editing posts
- **API routes** - Serverless functions that read/write to this GitHub repo

## Architecture

```
┌─────────────────┐      ┌─────────────────────────┐      ┌─────────────────┐
│   Browser       │      │   Vercel                │      │   GitHub        │
│                 │      │                         │      │                 │
│  /             ─┼──────┼─► index.html (static)   │      │                 │
│  /writing/*    ─┼──────┼─► post-page.js (SSR) ───┼──────┼─► posts/*.json  │
│  /editor.html  ─┼──────┼─► editor.html (static)  │      │                 │
│                 │      │                         │      │                 │
│  API calls     ─┼──────┼─► /api/posts.js ────────┼──────┼─► posts/*.json  │
│                 │      │   /api/images.js ───────┼──────┼─► images/*      │
│                 │      │   /api/books.js ────────┼──────┼─► books/*.json  │
└─────────────────┘      └─────────────────────────┘      └─────────────────┘
                                                                  │
                                                                  ▼
                                                           Auto-redeploy
```

### Blog Post Rendering (SSR)

Blog posts are **server-side rendered** for optimal SEO and social sharing:

1. Request comes in for `/writing/my-post-slug`
2. `api/post-page.js` fetches the post JSON from GitHub
3. Markdown is rendered to HTML server-side
4. Complete HTML with proper Open Graph meta tags is returned
5. Search engines and social crawlers see full content

This means:
- ✅ Full SEO indexing (content visible to crawlers)
- ✅ Proper social previews (title, description, cover image)
- ✅ Fast initial paint (no JavaScript required to see content)

## File Structure

```
/
├── index.html              # Landing page
├── editor.html             # Markdown editor (password protected)
├── styles.css              # Shared styles
│
├── posts/                  # Blog posts (JSON format)
│   └── *.json
│
├── books/                  # Bookshelf data
│   └── books.json
│
├── images/                 # Uploaded images
│   └── *.*
│
├── api/                    # Vercel serverless functions
│   ├── posts.js            # CRUD operations for posts
│   ├── post-page.js        # SSR blog post rendering
│   ├── images.js           # Image upload handler
│   └── books.js            # Books data handler
│
├── scripts/                # Development utilities
│   └── cleanup-images.js   # Orphaned image cleanup
│
├── package.json            # Dependencies
├── vercel.json             # Vercel configuration
└── README.md               # This file
```

## Routes

### Pages
| Route | Handler | Description |
|-------|---------|-------------|
| `/` | `index.html` (static) | Landing page with bio, books, posts list |
| `/writing/:slug` | `api/post-page.js` (SSR) | Server-rendered blog post |
| `/editor.html` | `editor.html` (static) | Markdown editor (requires password) |

### API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/posts` | List all posts |
| `GET` | `/api/posts?slug=xxx` | Get single post by slug |
| `POST` | `/api/posts` | Create new post |
| `PUT` | `/api/posts` | Update existing post |
| `DELETE` | `/api/posts?slug=xxx` | Delete post |
| `POST` | `/api/images` | Upload image (base64 body) |
| `GET` | `/api/books` | Get all books |
| `PUT` | `/api/books` | Replace all books |

### Static Assets
| Route | Source |
|-------|--------|
| `/images/*` | `images/` directory |
| `/fonts/*` | `fonts/` directory |
| `/styles.css` | `styles.css` |

## Post Format

Posts are stored as JSON files in `/posts/`:

```json
{
  "title": "My Post Title",
  "slug": "my-post-title",
  "date": "2025-12-30",
  "content": "# Heading\n\nMarkdown content...",
  "published": true,
  "coverImage": "https://raw.githubusercontent.com/.../images/cover.jpg"
}
```

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Display title |
| `slug` | string | URL-safe identifier, also filename (without .json) |
| `date` | string | ISO date (YYYY-MM-DD) |
| `content` | string | Markdown content |
| `published` | boolean | If false, hidden from landing page and returns 404 |
| `coverImage` | string | Optional cover image URL (used in SSR meta tags) |

## Environment Variables

Set these in Vercel dashboard (Settings → Environment Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_TOKEN` | Personal Access Token with `repo` scope | `ghp_xxxxxxxxxxxx` |
| `GITHUB_OWNER` | GitHub username | `bstanfield` |
| `GITHUB_REPO` | Repository name | `new-benstanfieldio` |
| `EDITOR_PASSWORD` | Password to access editor | `your-secret-password` |

### Creating a GitHub Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope (full control of private repositories)
3. Copy token and add to Vercel environment variables

## Local Development

```bash
# Install dependencies
npm install

# Set environment variables (create .env.local)
echo "GITHUB_TOKEN=ghp_xxx" >> .env.local
echo "GITHUB_OWNER=your-username" >> .env.local
echo "GITHUB_REPO=new-benstanfieldio" >> .env.local
echo "EDITOR_PASSWORD=localdev" >> .env.local

# Run development server
npm run dev
```

Visit `http://localhost:3000` for the landing page, `http://localhost:3000/editor.html` for the editor.

### Image Cleanup

When images are removed from posts, they remain in the `images/` directory. A cleanup script helps manage orphaned images:

```bash
# Check for orphaned images (runs automatically with npm run dev)
node scripts/cleanup-images.js

# Delete orphaned images (interactive, with confirmation)
npm run cleanup:images
```

**Safeguards:**
- **Protected images**: Core site images (`ben-smiling-pic.png`, `benstanfieldio-opengraph.png`, `left-chevron.svg`) are never deleted
- **7-day grace period**: Recently uploaded images are not flagged (in case they're for draft posts)
- **Interactive confirmation**: Deletion requires explicit `y` confirmation
- **Git recovery**: Even if deleted, images can be recovered from git history

## Deployment

```bash
# Deploy to Vercel
npm run deploy

# Or connect GitHub repo to Vercel for auto-deploy on push
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start local dev server (also checks for orphaned images) |
| `npm run deploy` | Deploy to Vercel production |
| `npm run cleanup:images` | Interactively delete orphaned images |

## Design System

The site follows a Patrick Collison-inspired aesthetic:

- **Typography**: Lava (custom) for headings, system sans-serif fallback
- **Colors**: 
  - Light mode: `#1a1a1a` text, `#0066cc` links, `#ffffff` background
  - Dark mode: `#e5e5e5` text, `#6bb3ff` links, `#1a1a1a` background
- **Layout**: 
  - Max-width: 650px for content
  - Right-aligned navigation
  - Generous whitespace
- **Interactions**: Minimal, purposeful hover states
- **Theme**: Auto-detects system preference, with manual toggle

## Editor Features

The markdown editor (`editor.html`) provides:

- **Distraction-free writing**: Clean, minimal interface
- **Live preview**: See rendered markdown as you type
- **Image upload**: Drag-and-drop or click to upload
- **Post management**: Create, edit, delete posts
- **Auto-save indicator**: Know when your work is saved
- **Keyboard shortcuts**:
  - `Cmd/Ctrl + S`: Save post
  - `Cmd/Ctrl + B`: Bold
  - `Cmd/Ctrl + I`: Italic

## Security

- **Editor authentication**: Simple password protection via `EDITOR_PASSWORD` env var
- **GitHub token**: Stored server-side only, never exposed to browser
- **API routes**: All mutations require valid authorization header

## Troubleshooting

### Posts not appearing after save
- Check Vercel deployment logs for errors
- Verify GitHub token has `repo` scope
- Wait ~30 seconds for redeploy

### Editor not saving
- Check browser console for errors
- Verify environment variables are set
- Check GitHub API rate limits (5000/hour)

### Images not uploading
- Max file size: 25MB (GitHub limit)
- Supported formats: jpg, png, gif, webp

### Blog post showing 404
- Check that `published` is `true` in the post JSON
- Verify the slug matches the filename (without `.json`)

---

Built with vanilla HTML/CSS/JS, Vercel serverless functions, and GitHub as a CMS.
