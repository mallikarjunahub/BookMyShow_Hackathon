import express from "express";
import "dotenv/config";
import eventRoutes from "./Routes/eventRoutes.js";
import userRoutes from "./Routes/userRoutes.js";
import "./Middleware/Authentication.js";

const app = express();
app.use(express.json());

app.use("/", eventRoutes);
app.use("/", userRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server is listening at ${process.env.PORT}`);
});
