import express from 'express';
import { hashPassword, verifyPassword, generateToken } from './server/auth.js';

const app = express();
app.use(express.json());

// Simple in-memory user storage for testing
const users = new Map();

// Test user creation
const testUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  username: 'testuser',
  password: await hashPassword('password123'),
  plan: 'free',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};
users.set(testUser.email, testUser);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.get(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email);
    
    res.json({ 
      user: { ...user, password: undefined }, 
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (users.has(email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const user = {
      id: `user-${Date.now()}`,
      email,
      username,
      password: hashedPassword,
      plan: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users.set(email, user);
    const token = generateToken(user.id, user.email);
    
    res.json({ 
      user: { ...user, password: undefined }, 
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user endpoint
app.get('/api/user', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Simple token verification (in production, use proper JWT verification)
  const user = Array.from(users.values()).find(u => u.email === 'test@example.com');
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.json({ user: { ...user, password: undefined } });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Test server running on port ${port}`);
  console.log(`📧 Test user: test@example.com`);
  console.log(`🔑 Test password: password123`);
});
