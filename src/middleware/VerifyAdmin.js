const jwt = require('jsonwebtoken');

const Verifyadmin = (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = Verifyadmin;