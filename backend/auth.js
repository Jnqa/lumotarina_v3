const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Middleware для проверки JWT из httpOnly cookie
function requireAuth(req, res, next) {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
}

// Функция для проверки что пользователь имеет доступ к данным другого пользователя
// (текущий пользователь должен быть тем же самым, или иметь admin право)
function canAccessUserData(req, targetUserId) {
  // Если JWT содержит tgId, проверяем что это тот же пользователь или админ
  if (req.user && req.user.tgId) {
    // TODO: добавить проверку админ статуса позже
    return req.user.tgId === targetUserId;
  }
  return false;
}

module.exports = { requireAuth, canAccessUserData };
