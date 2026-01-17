const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    minlength:4,
  },
  description:{
    type: String,
    minlength:4,
  },
  ideal: {
    type: String,
    minlength:4,
  },
 mode: {
  type: [String],
  enum: ["Audio", "Chat"],
  required: true,
},
  price:{
    type: Number,
    minlength:4,
  },
  image:{
    type:String,
    minlength:4,
  }
});

module.exports = mongoose.model("Service",serviceSchema)