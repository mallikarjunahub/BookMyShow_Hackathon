import express from "express";
import { eventModel } from "../models/event.js";
import { bookingsModel } from "../models/bookings.js";
import authMiddleware from "../Middleware/Authentication.js";
import seat from "../models/seat.js";
import mongoose from "mongoose";

const router = express.Router();

// Search events
router.get("/events", async (req, res) => {
  const value = req.query.value;
  try {
    const events = await eventModel.find({
      $or: [
        { m_name: { $regex: value, $options: "i" } },
        { m_type: { $regex: value, $options: "i" } },
        { m_location: { $regex: value, $options: "i" } },
        { m_tags: { $regex: value, $options: "i" } },
      ],
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get event by ID
router.get("/event/:id", async (req, res) => {
  try {
    const event = await eventModel.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    res.json(event);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add new event
router.post("/addevent", authMiddleware, async (req, res) => {
  if (!req.user.roles.includes("admin")) {
    return res.status(403).json({
      message: "Access Denied: Only admins can add events.",
    });
  }

  try {
    const {
      Name,
      Description,
      Price,
      startDate,
      endDate,
      seatQuantity,
      location,
      Type,
      tags,
    } = req.body;

    const tagArray =
      typeof tags === "string"
        ? tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : tags;
    console.log(req.body);
    console.log("Tags Array:", tagArray);
    const newEvent = await eventModel.create({
      m_name: Name,
      m_desc: Description,
      m_start_date: startDate,
      m_end_date: endDate,
      m_price: Price,
      m_location: location,
      m_seat_quantity: seatQuantity,
      m_type: Type,
      m_tags: tagArray,
    });

    res.status(201).json(newEvent);
  } catch (err) {
    res.status(406).json({ error: err });
  }
});

// Get bookings by user
router.get("/bookings/:userId", async (req, res) => {
  try {
    const bookings = await bookingsModel.find({ u_id: req.params.userId });
    res.json(bookings);
  } catch {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//booking seat
router.post("/bookseat/:userId", async (req, res) => {
  const { eventId, seatNumber } = req.body;
  const uId = req.params.userId;

  try {
    const event = await eventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const existingBooking = await bookingsModel.findOne({
      m_id: eventId,
      b_seat_number: { $in: seatNumber },
    });

    if (existingBooking) {
      const alreadyBookedSeats = existingBooking.b_seat_number.filter((seat) =>
        seatNumber.includes(seat)
      );

      return res.status(409).json({
        error: `seats are already booked: ${alreadyBookedSeats.join(", ")}`,
      });
    }

    const booking = await bookingsModel.create({
      u_id: uId,
      m_id: event._id,
      b_event_name: event.m_name,
      b_price: event.m_price,
      b_seat_number: seatNumber,
      b_booking_date: event.m_start_date,
      b_status: "Confirmed",
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
});

// Lock seats
router.post("/lockseats", async (req, res) => {
  try {
    const { seatNumbers, eventId, userId } = req.body;

    if (
      !Array.isArray(seatNumbers) ||
      !seatNumbers.length ||
      !eventId ||
      !userId
    ) {
      return res
        .status(400)
        .json({ error: "Missing or invalid seatNumbers, eventId, or userId" });
    }

    const availableSeats = await seat.find({
      seatNumber: { $in: seatNumbers },
      eventId,
      status: "AVAILABLE",
    });

    const result = await seat.updateMany(
      {
        seatNumber: { $in: seatNumbers },
        eventId,
        status: "AVAILABLE",
      },
      {
        $set: {
          status: "LOCKED",
          lockedBy: userId,
          lockedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount !== seatNumbers.length) {
      await seat.updateMany(
        {
          seatNumber: { $in: seatNumbers },
          eventId,
          lockedBy: userId,
          status: "LOCKED",
        },
        {
          $set: { status: "AVAILABLE" },
          $unset: { lockedBy: "", lockedAt: "" },
        }
      );

      return res
        .status(409)
        .json({ message: "Seat locking conflict. Try again." });
    }

    return res.status(200).json({ message: "Seats locked successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: `Failed to lock seats: ${err.message}` });
  }
});

// Book seats after locking
router.post("/book-seats", async (req, res) => {
  const { seatNumbers, showId, userId } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const seats = await seat
      .find({
        seatNumber: { $in: seatNumbers },
        showId,
        status: "LOCKED",
        lockedBy: userId,
      })
      .session(session);

    if (seats.length !== seatNumbers.length) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Seats not locked by user or already booked" });
    }

    await seat.updateMany(
      { seatNumber: { $in: seatNumbers }, showId },
      {
        $set: { status: "BOOKED" },
        $unset: { lockedBy: "", lockedAt: "" },
      },
      { session }
    );

    await Booking.create(
      [
        {
          userId,
          showId,
          seats: seatNumbers,
          bookedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(200).json({ message: "Booking successful" });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ error: "Booking failed" });
  } finally {
    session.endSession();
  }
});

setInterval(async () => {
  const expiryTime = new Date(Date.now() - 5 * 60 * 1000);
  try {
    await seat.updateMany(
      { status: "LOCKED", lockedAt: { $lt: expiryTime } },
      {
        $set: { status: "AVAILABLE" },
        $unset: { lockedBy: "", lockedAt: "" },
      }
    );
  } catch (err) {
    console.error("Failed to release expired locks", err);
  }
}, 60 * 1000);

export default router;
