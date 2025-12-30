import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'PUT':
        return await handlePut(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/books - Get all books
async function handleGet(req, res) {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'books/books.json',
    });

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const books = JSON.parse(content);
    
    // Include SHA for updates
    return res.status(200).json({ books, sha: data.sha });
  } catch (error) {
    if (error.status === 404) {
      return res.status(200).json({ books: [], sha: null });
    }
    throw error;
  }
}

// PUT /api/books - Update all books
async function handlePut(req, res) {
  // Verify password
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.EDITOR_PASSWORD}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { books, sha } = req.body;

  if (!books || !Array.isArray(books)) {
    return res.status(400).json({ error: 'Books array is required' });
  }

  if (!sha) {
    return res.status(400).json({ error: 'SHA is required for updates' });
  }

  // Save the updated books
  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: 'books/books.json',
    message: 'Update books',
    content: Buffer.from(JSON.stringify(books, null, 2)).toString('base64'),
    sha,
  });

  return res.status(200).json({ books, sha: data.content.sha });
}
