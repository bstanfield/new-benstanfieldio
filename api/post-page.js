import { Octokit } from '@octokit/rest';
import { marked } from 'marked';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

export default async function handler(req, res) {
  // Extract slug from URL path
  const slug = req.url.match(/\/writing\/([^?]+)/)?.[1];
  
  if (!slug) {
    return res.status(404).send(render404Page());
  }

  try {
    // Fetch post from GitHub
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: `posts/${slug}.json`,
    });

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const post = JSON.parse(content);

    // Don't render unpublished posts
    if (post.published === false) {
      return res.status(404).send(render404Page());
    }

    // Render the full HTML page
    const html = renderPostPage(post);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.send(html);
    
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).send(render404Page());
    }
    console.error('Error fetching post:', error);
    return res.status(500).send(render500Page());
  }
}

function renderPostPage(post) {
  const date = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Generate excerpt for meta description (first ~160 chars of content)
  const excerpt = post.content
    .replace(/^#.*$/gm, '') // Remove headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/[*_`]/g, '') // Remove formatting
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
    .trim()
    .split('\n')[0]
    .slice(0, 160);

  // Render markdown to HTML
  const renderedContent = marked.parse(post.content);

  // Hero image HTML
  const heroImage = post.coverImage 
    ? `<img src="${post.coverImage}" alt="${post.title}" class="post-hero-image">`
    : '';

  // OG image (use cover image or default)
  const ogImage = post.coverImage || 'https://benstanfield.io/images/benstanfieldio-opengraph.png';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(post.title)} — Benjamin Stanfield</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="${escapeHtml(excerpt)}" />
    <meta name="author" content="Benjamin Stanfield" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#ffffff" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/favicon.png" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://benstanfield.io/writing/${post.slug}" />
    
    <!-- Open Graph Tags -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="https://benstanfield.io/writing/${post.slug}" />
    <meta property="og:title" content="${escapeHtml(post.title)}" />
    <meta property="og:description" content="${escapeHtml(excerpt)}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:site_name" content="Benjamin Stanfield" />
    <meta property="article:published_time" content="${post.date}" />
    <meta property="article:author" content="Benjamin Stanfield" />
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(post.title)}" />
    <meta name="twitter:description" content="${escapeHtml(excerpt)}" />
    <meta name="twitter:image" content="${ogImage}" />
    
    <link rel="stylesheet" href="/styles.css" />
    <script>
      // Apply saved theme immediately to prevent flash
      (function () {
        let theme = localStorage.getItem("theme");
        if (!theme) {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (prefersDark) {
            theme = "dark";
          } else {
            const currentHour = new Date().getHours();
            theme = currentHour >= 17 ? "dark" : "light";
          }
        }
        document.documentElement.setAttribute("data-theme", theme);
      })();
    </script>
  </head>
  <body>
    <!-- Right-aligned navigation -->
    <nav class="site-nav">
      <ul id="nav-links">
        <li><a href="/#about">About</a></li>
        <li><a href="/#posts">Writing</a></li>
        <li><a href="/#bookshelf">Bookshelf</a></li>
        <li><a href="https://wren.co" target="_blank">Wren</a></li>
        <li><a href="https://www.linkedin.com/in/meetben/" target="_blank">LinkedIn</a></li>
        <li><a href="https://github.com/bstanfield" target="_blank">GitHub</a></li>
      </ul>
    </nav>

    <main class="container">
      <article>
        <header style="margin-bottom: 2rem;">
          <a href="/" class="back-link">
            <img src="/images/left-chevron.svg" alt="Back" class="back-icon">
          </a>
          ${heroImage}
          <h1 style="margin-top: 1rem;">${escapeHtml(post.title)}</h1>
          <time style="color: var(--color-text-secondary); font-size: 0.9rem;">${date}</time>
        </header>
        <div class="post-content">
          ${renderedContent}
        </div>
      </article>
      <footer class="site-footer">
        <ul class="footer-links">
          <li><a href="https://wren.co" target="_blank">Wren</a></li>
          <li><a href="https://toposdata.com" target="_blank">Topos</a></li>
          <li><a href="https://www.linkedin.com/in/meetben/" target="_blank">LinkedIn</a></li>
          <li><a href="https://github.com/bstanfield" target="_blank">GitHub</a></li>
        </ul>
        <button id="theme-toggle-btn" class="theme-toggle-btn">Toggle</button>
      </footer>
    </main>

    <script>
      // Theme Toggle
      (function() {
        function updateThemeButton() {
          const btn = document.getElementById("theme-toggle-btn");
          if (!btn) return;
          const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
          btn.textContent = currentTheme === "light" ? "Dark" : "Light";
        }
        
        updateThemeButton();

        document.addEventListener("click", (e) => {
          if (e.target.id === "theme-toggle-btn") {
            const theme = document.documentElement.getAttribute("data-theme");
            const newTheme = theme === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            e.target.textContent = newTheme === "light" ? "Dark" : "Light";
          }
        });
      })();
    </script>
  </body>
</html>`;
}

function render404Page() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Post Not Found — Benjamin Stanfield</title>
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="stylesheet" href="/styles.css" />
    <script>
      (function () {
        let theme = localStorage.getItem("theme");
        if (!theme) {
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          theme = prefersDark ? "dark" : "light";
        }
        document.documentElement.setAttribute("data-theme", theme);
      })();
    </script>
  </head>
  <body>
    <main class="container">
      <h1>Post Not Found</h1>
      <p>Sorry, this post doesn't exist.</p>
      <p><a href="/">← Back to home</a></p>
    </main>
  </body>
</html>`;
}

function render500Page() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Error — Benjamin Stanfield</title>
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main class="container">
      <h1>Something went wrong</h1>
      <p>Sorry, there was an error loading this page.</p>
      <p><a href="/">← Back to home</a></p>
    </main>
  </body>
</html>`;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

