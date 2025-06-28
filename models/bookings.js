import mongoose, { Schema } from "mongoose";

const booking = new mongoose.Schema(
  {
    u_id: { type: Schema.Types.ObjectId, ref: "user" },
    m_id: { type: Schema.Types.ObjectId, ref: "eventModel" },
    b_event_name: String,
    b_amount: Number,
    b_seat_number: { type: [Number], default: [], required: true },
    b_booking_date: { type: Date, default: Date.now },
    b_status: {
      type: String,
      enum: ["Confirmed", "Cancelled"],
      default: "Confirmed",
      required: true,
    },
  },
  { timestamps: true }
);

export const bookingsModel = mongoose.model("bookingsModel", booking);
