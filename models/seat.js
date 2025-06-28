import mongoose, { Schema } from "mongoose";

const seatSchema = new mongoose.Schema({
  seatNumber: Number,
  eventId: { type: Schema.Types.ObjectId, ref: "eventModel" },
  status: {
    type: String,
    enum: ["AVAILABLE", "LOCKED", "BOOKED"],
    default: "AVAILABLE",
  },
  lockedBy: String,
  lockedAt: Date,
});

seatSchema.index({ lockedAt: 1 }, { expireAfterSeconds: 300 });

export default mongoose.model("seat", seatSchema);
