const botAuth = (req, res, next) => {
  const checkToken = req.headers['x-bot-secret'];
  if (!checkToken || checkToken !== process.env.BOT_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid bot secret' });
  }
  next();
};

module.exports = botAuth;
