# benstanfield.io

A minimal personal website with a GitHub-powered blog editor, deployed on Vercel.

## Overview

This site consists of:
- **Landing page** (`index.html`) - Bio, bookshelf, and blog posts
- **Editor** (`editor.html`) - Notion-like markdown editor for creating/editing posts
- **API routes** - Serverless functions that read/write to this GitHub repo

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Browser       │      │   Vercel        │      │   GitHub        │
│                 │      │                 │      │                 │
│  index.html ────┼──────┼─► /api/posts ───┼──────┼─► /posts/*.json │
│  editor.html ───┼──────┼─► /api/images ──┼──────┼─► /images/*     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                          │
                                                          ▼
                                                   Auto-redeploy
```

When you save a post in the editor:
1. Editor calls `/api/posts` with post content
2. API uses GitHub API to commit the file to this repo
3. GitHub webhook triggers Vercel redeploy (~30 seconds)
4. New content is live

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
├── images/                 # Uploaded images
│   └── *.*
│
├── api/                    # Vercel serverless functions
│   ├── posts.js            # CRUD operations for posts
│   └── images.js           # Image upload handler
│
├── package.json            # Dependencies
├── vercel.json             # Vercel configuration
└── README.md               # This file
```

## Routes

### Pages
| Route | File | Description |
|-------|------|-------------|
| `/` | `index.html` | Landing page with bio, books, posts |
| `/editor.html` | `editor.html` | Markdown editor (requires password) |

### API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/posts` | List all posts |
| `GET` | `/api/posts?slug=xxx` | Get single post by slug |
| `POST` | `/api/posts` | Create new post |
| `PUT` | `/api/posts` | Update existing post |
| `DELETE` | `/api/posts?slug=xxx` | Delete post |
| `POST` | `/api/images` | Upload image (base64 body) |

### Static Assets
| Route | Source |
|-------|--------|
| `/posts/*.json` | `posts/` directory |
| `/images/*` | `images/` directory |
| `/styles.css` | `styles.css` |

## Post Format

Posts are stored as JSON files in `/posts/`:

```json
{
  "title": "My Post Title",
  "slug": "my-post-title",
  "date": "2025-12-30",
  "content": "# Heading\n\nMarkdown content with **bold**, *italic*, [links](url), and ![images](/images/photo.jpg).",
  "published": true
}
```

### Fields
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Display title |
| `slug` | string | URL-safe identifier, also filename (without .json) |
| `date` | string | ISO date (YYYY-MM-DD) |
| `content` | string | Markdown content |
| `published` | boolean | If false, hidden from landing page |

## Environment Variables

Set these in Vercel dashboard (Settings → Environment Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_TOKEN` | Personal Access Token with `repo` scope | `ghp_xxxxxxxxxxxx` |
| `GITHUB_OWNER` | GitHub username | `benstanfield` |
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

## Deployment

```bash
# Deploy to Vercel
npm run deploy

# Or connect GitHub repo to Vercel for auto-deploy on push
```

## Design System

The site follows a Patrick Collison-inspired aesthetic:

- **Typography**: Georgia for headings, system sans-serif for body
- **Colors**: 
  - Text: `#1a1a1a`
  - Links: `#0066cc`
  - Background: `#ffffff`
  - Subtle borders: `#e5e5e5`
- **Layout**: 
  - Max-width: 650px for content
  - Right-aligned navigation
  - Generous whitespace
- **Interactions**: Minimal, purposeful hover states

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
- **API routes**: All mutations require valid session

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

## Contributing

This is a personal site, but the architecture could be adapted for others. Key files to customize:

1. `index.html` - Bio content, bookshelf
2. `styles.css` - Colors, typography
3. `api/posts.js` - Modify post schema if needed

---

Built with vanilla HTML/CSS/JS, Vercel serverless functions, and GitHub as a CMS.
