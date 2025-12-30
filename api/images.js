import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify password
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.EDITOR_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { filename, content, contentType } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (contentType && !allowedTypes.includes(contentType)) {
      return res.status(400).json({ error: 'Invalid file type. Allowed: jpg, png, gif, webp' });
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const ext = filename.split('.').pop().toLowerCase();
    const safeName = filename
      .replace(/\.[^.]+$/, '') // Remove extension
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const newFilename = `${safeName}-${timestamp}.${ext}`;
    const path = `images/${newFilename}`;

    // Upload to GitHub
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Upload image: ${newFilename}`,
      content, // Already base64 encoded
    });

    // Return the URL to the image
    // In production, this will be served by Vercel from the repo
    const imageUrl = `/${path}`;

    return res.status(201).json({
      success: true,
      filename: newFilename,
      url: imageUrl,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}
