const mongoose = require("mongoose")


const bookingSchema = new mongoose.Schema(
    {
        user:{
            type: mongoose.Schema.Types.ObjectId, // ✅ FIX
            ref: "User",
            required: true,
        },
        service:{
            type:mongoose.Schema.Types.ObjectId,
            ref: "Service",
            required: true 
        },
        isCompleted: {
        type: Boolean,
        default: false, 
        // session not completed initially
        isReviewed: {
        type: Boolean,
        default: false, // review not given yet
    },
    },

    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model("Booking",bookingSchema)
