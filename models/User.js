import mongoose from "mongoose";

const User = new mongoose.Schema(
  {
    u_first_name: String,
    u_second_name: String,
    u_email: { type: String, required: true },
    u_mobile_number: Number,
    password: { type: String, required: true },
    age: Number,
    role: {
      type: [String],
      enum: ["admin", "user"],
      default: [],
      required: true,
    },
  },
  { timestamps: true }
);

export const user = mongoose.model("user", User);
