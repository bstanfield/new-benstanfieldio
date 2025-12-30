import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/posts - List all posts or get single post
async function handleGet(req, res) {
  const { slug } = req.query;

  if (slug) {
    // Get single post
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: `posts/${slug}.json`,
      });

      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      const post = JSON.parse(content);
      post.sha = data.sha; // Include SHA for updates

      return res.status(200).json(post);
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({ error: 'Post not found' });
      }
      throw error;
    }
  }

  // List all posts
  try {
    const { data: files } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'posts',
    });

    const posts = await Promise.all(
      files
        .filter(file => file.name.endsWith('.json') && file.name !== '.gitkeep')
        .map(async (file) => {
          const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: file.path,
          });

          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          const post = JSON.parse(content);
          post.sha = data.sha;
          return post;
        })
    );

    return res.status(200).json(posts);
  } catch (error) {
    if (error.status === 404) {
      // No posts directory or empty
      return res.status(200).json([]);
    }
    throw error;
  }
}

// POST /api/posts - Create new post
async function handlePost(req, res) {
  // Verify password
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.EDITOR_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, content, published = true } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  // Generate slug from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const post = {
    title,
    slug,
    date: new Date().toISOString().split('T')[0],
    content,
    published,
  };

  // Check if post already exists
  try {
    await octokit.repos.getContent({
      owner,
      repo,
      path: `posts/${slug}.json`,
    });
    return res.status(409).json({ error: 'Post with this slug already exists' });
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
  }

  // Create the post
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `posts/${slug}.json`,
    message: `Create post: ${title}`,
    content: Buffer.from(JSON.stringify(post, null, 2)).toString('base64'),
  });

  return res.status(201).json(post);
}

// PUT /api/posts - Update existing post
async function handlePut(req, res) {
  // Verify password
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.EDITOR_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug, title, content, published, sha } = req.body;

  if (!slug || !sha) {
    return res.status(400).json({ error: 'Slug and SHA are required' });
  }

  // Get existing post
  let existingPost;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: `posts/${slug}.json`,
    });

    existingPost = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'Post not found' });
    }
    throw error;
  }

  // Update fields
  const updatedPost = {
    ...existingPost,
    title: title || existingPost.title,
    content: content !== undefined ? content : existingPost.content,
    published: published !== undefined ? published : existingPost.published,
  };

  // Save the update
  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: `posts/${slug}.json`,
    message: `Update post: ${updatedPost.title}`,
    content: Buffer.from(JSON.stringify(updatedPost, null, 2)).toString('base64'),
    sha,
  });

  updatedPost.sha = data.content.sha;
  return res.status(200).json(updatedPost);
}

// DELETE /api/posts - Delete a post
async function handleDelete(req, res) {
  // Verify password
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.EDITOR_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' });
  }

  // Get file SHA
  let sha;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: `posts/${slug}.json`,
    });
    sha = data.sha;
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'Post not found' });
    }
    throw error;
  }

  // Delete the file
  await octokit.repos.deleteFile({
    owner,
    repo,
    path: `posts/${slug}.json`,
    message: `Delete post: ${slug}`,
    sha,
  });

  return res.status(200).json({ success: true });
}
