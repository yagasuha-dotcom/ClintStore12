// Simple session-based authentication for admin
const sessions = {};

const createSession = (username) => {
  const sessionId = require('crypto').randomBytes(16).toString('hex');
  sessions[sessionId] = {
    username,
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  return sessionId;
};

const validateSession = (sessionId) => {
  if (!sessionId || !sessions[sessionId]) {
    return false;
  }
  
  const session = sessions[sessionId];
  if (session.expiresAt < Date.now()) {
    delete sessions[sessionId];
    return false;
  }
  
  return true;
};

const getSessionUser = (sessionId) => {
  if (validateSession(sessionId)) {
    return sessions[sessionId].username;
  }
  return null;
};

const destroySession = (sessionId) => {
  delete sessions[sessionId];
};

const adminAuth = (req, res, next) => {
  const sessionId = req.cookies?.sessionId || req.query.sessionId;
  
  if (!validateSession(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized. Please login first.' });
  }
  
  req.sessionId = sessionId;
  req.username = getSessionUser(sessionId);
  next();
};

module.exports = {
  createSession,
  validateSession,
  getSessionUser,
  destroySession,
  adminAuth,
  sessions
};
