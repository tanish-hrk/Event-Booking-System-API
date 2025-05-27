const jwt = require("jsonwebtoken");
const { User } = require("../models");

const authToken = async (req, res, next) => {
  const authHdr = req.headers["authorization"];
  const token = authHdr && authHdr.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Token missing" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    if (e.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({
          success: false,
          message: "Token expired",
          code: "TOKEN_EXPIRED",
        });
    }
    if (e.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({
          success: false,
          message: "Invalid token",
          code: "INVALID_TOKEN",
        });
    }
    if (e.name === "NotBeforeError") {
      return res
        .status(401)
        .json({
          success: false,
          message: "Token not active",
          code: "TOKEN_NOT_ACTIVE",
        });
    }
    return res.status(500).json({ success: false, message: "Auth error" });
  }

  const user = await User.findByPk(decoded.userId);
  if (!user)
    return res.status(401).json({ success: false, message: "User not found" });
  if (!user.isActive)
    return res.status(401).json({ success: false, message: "User inactive" });

  req.user = {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    userObj: user,
  };

  next();
};

const optionalAuth = async (req, res, next) => {
  const authHdr = req.headers["authorization"];
  const token = authHdr && authHdr.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    if (user && user.isActive) {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        userObj: user,
      };
    }
  } catch (e) {
    // ignore errors here
  }
  next();
};

const checkTokenExpiry = (req, res, next) => {
  if (req.user) {
    const authHdr = req.headers["authorization"];
    const token = authHdr && authHdr.split(" ")[1];
    if (token) {
      const decoded = jwt.decode(token);
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = decoded.exp - now;
      if (timeLeft < 3600) {
        res.set("X-Token-Refresh-Suggested", "true");
        res.set("X-Token-Expires-In", timeLeft.toString());
      }
    }
  }
  next();
};

module.exports = {
  authenticateToken: authToken,
  optionalAuth,
  checkTokenExpiry,
};
