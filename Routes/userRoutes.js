import express from "express";
import { user } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import authMiddleware from "../Middleware/Authentication.js";

const router = express.Router();
router.use(express.json());

// Register
router.post("/register", async (req, res) => {
  const { firstName, secondName, email, password, role } = req.body;

  if (!firstName || !email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const existingUser = await user.findOne({ u_email: email });

    if (existingUser) {
      if (existingUser.role.includes(role)) {
        return res
          .status(409)
          .json({ message: `User already has role '${role}'` });
      }

      const updatedUser = await user
        .findOneAndUpdate(
          { u_email: email },
          { $addToSet: { role } },
          { new: true }
        )
        .select("-password");

      return res
        .status(200)
        .json({ message: "Role added.", user: updatedUser });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await user.create({
      u_first_name: firstName,
      u_second_name: secondName,
      u_email: email,
      password: hashedPassword,
      role: [role],
    });

    res.status(201).json({ message: "User created", user: newUser });
  } catch (err) {
    res.status(500).json({ error: "Error during registration" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: "Missing login credentials." });
  }

  try {
    const currentUser = await user.findOne({ u_email: email });
    if (!currentUser)
      return res.status(401).json({ message: "Invalid credentials." });

    if (!currentUser.role.includes(role)) {
      return res
        .status(403)
        .json({ message: `Access denied for role: ${role}` });
    }

    const isMatch = await bcrypt.compare(password, currentUser.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials." });

    const token = jwt.sign(
      {
        id: currentUser._id,
        firstName: currentUser.u_first_name,
        email: currentUser.u_email,
        roles: currentUser.role,
      },
      process.env.TOKEN,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: currentUser._id,
        fName: currentUser.u_first_name,
        sName: currentUser.u_second_name,
        email: currentUser.u_email,
        roles: currentUser.role,
      },
    });
  } catch {
    res.status(500).json({ error: "Internal error during login" });
  }
});

// Get all users
router.get("/users", authMiddleware, async (req, res) => {
  console.log("Fetching all users");
  try {
    const users = await user.find().select("-password");
    res.json(users);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
