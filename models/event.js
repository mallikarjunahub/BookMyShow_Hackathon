import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  m_name: { type: String, required: true },
  m_desc: String,
  m_start_date: { type: Date, required: true },
  m_end_date: { type: Date },
  m_price: { type: Number, required: true },
  m_seat_quantity: { type: Number, required: true },
  m_location: { type: String, required: true },
  m_type: { type: String, enum: ["movie", "event"] },
  m_tags: { type: [String], default: [] },
});

export const eventModel = mongoose.model("eventModel", eventSchema);
