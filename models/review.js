const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    // Tie a review to the specific booking that was delivered.
    // Different users (different bookings) CAN all review the same service;
    // the unique index below enforces ONE review per (booking, service) pair.
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    mode: {
      type: String,
      enum: ["Chat", "Audio"],
      required: true,
    },
  },
  { timestamps: true }
);

// ONE review per (booking, service) pair:
//  - many different users (each with their own delivered booking) CAN review
//    the SAME service — uniqueness is per booking, not per service.
//  - a single booking can never produce two reviews.
reviewSchema.index({ booking: 1, service: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
