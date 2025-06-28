import mongoose from "mongoose";
import "dotenv/config";
import jwt from "jsonwebtoken";

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_DB_URL)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((error) => {
    console.log("Error while connecting DataBase", error);
  });

const authMiddleware = (req, res, next) => {
  console.log("Authentication middleware is triggered");
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(403).json({
      message: "No token or invalid token format found.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN);
    console.log("Decoded JWT:", decoded);
    req.user = decoded;
    if (
      req.user.roles &&
      req.user.roles.includes("user") &&
      !req.user.roles.includes("admin")
    ) {
      return res.status(403).json({
        message: "You are not Adimin (admin role required)",
      });
    }
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized: Token expired." });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Unauthorized: Invalid token." });
    }
    res
      .status(500)
      .json({ message: "Internal Server Error during authentication." });
  }
};

export default authMiddleware;
