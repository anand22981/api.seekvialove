const mongoose = require("mongoose")


const bookingSchema = new mongoose.Schema(
    {
        user:{
            type:String,
            required: true 
        },
        service:{
            type:mongoose.Schema.Types.ObjectId,
            ref: "Service",
            required: true 
        }

    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model("Booking",bookingSchema)
