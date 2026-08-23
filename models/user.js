const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minlength: 4,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid email address" + value);
        }
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 4,
    },
    dob: {
      type: Date,
      minlength: 4,
    },
    birthPlace: {
      type: String,
      minlength: 4,
    },
    birthTime: {
      type: String,
      minlength: 4,
    },
    gender: {
      type: String,
      enum: ["male", "female", "others"],
      required: false,
      default: "other",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    googleId: {
      type: String,
      default: null,
    },

    profilePicture: {
      type: String,
      default: null,
    },
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
