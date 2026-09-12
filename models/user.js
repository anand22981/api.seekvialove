const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minlength: 1,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
    },

    emailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,

      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid email address: " + value);
        }
      },
    },

    // Password is required only for normal accounts.
    // Google accounts do not need a password.

  authProvider: {
  type: String,
  enum: ["local", "google"],
  default: "local"
},
  password: {
  type: String,
  required: function () {
    return this.authProvider === "local";
  },
  minlength: 4
},

    dob: {
      type: Date,
    },

    birthPlace: {
      type: String,
      minlength: 4,
      trim: true,
    },

    birthTime: {
      type: String,
      minlength: 4,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "others"],
      default: "others",
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // Google OAuth account ID
    googleId: {
      type: String,
      default: null,
    },

    // Google profile picture
    profilePicture: {
      type: String,
      default: null,
    },

    otp: String,

    resetOtp: String,

    resetOtpExpires: Date
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);