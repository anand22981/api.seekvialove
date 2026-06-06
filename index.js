const express = require("express");
const connectDb = require("./config/dbconfig");
const User = require("./models/user");
const Service = require("./models/services");
const Booking = require("./models/booking")
const Review = require("./models/review");
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();

app.use(
  cors({
    origin: [
    "http://3.213.27.192:8080",
    "http://localhost:5173"
  ],
    methods: ["GET", "POST", "PUT", "DELETE","PATCH","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization", "X-Session-Id"],
    credentials: true,
  })
);

app.use(express.json());

app.set("trust proxy", 1);
app.use(
  session({
    name: "seekvialove.sid",
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production" ? true : false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

// ─── Middleware to restore session from X-Session-Id header ───
// This runs AFTER express-session middleware, so req.session exists but may be empty/new
app.use((req, res, next) => {
  const sessionId = req.headers['x-session-id'];
  
  // If X-Session-Id header is provided, ALWAYS try to restore from it
  // This takes precedence over cookie-based session
  if (sessionId) {
    const sessionStore = req.sessionStore;
    sessionStore.get(sessionId, (err, session) => {
      if (!err && session && session.userId) {
        // Restore all session data from the stored session
        req.session.userId = session.userId;
        req.session.emailId = session.emailId;
        req.session.firstName = session.firstName;
        req.session.lastName = session.lastName;
        req.session.role = session.role;
      }
      next();
    });
  } else {
    // No X-Session-Id header, use cookie-based session (default express-session behavior)
    next();
  }
});

// ─── Auth middleware: require login ───
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: "Login required" });
  }
  next();
};

// ─── Auth middleware: require admin ───
const requireAdmin = (req, res, next) => {
  if (!req.session.userId || req.session.role !== "admin") {
    return res.status(403).json({ success: false, message: "Unauthorized" });
  }
  next();
};

//SignUp
app.post("/v1/signup", async (req, res) => {
  try {
    const { emailId } = req.body;
    const existingUser = await User.findOne({ emailId });

    if (existingUser) {
      return res.status(200).json({ message: "User already exists" });
    }

    const user = new User(req.body);
    await user.save();

    res.status(201).json({ message: "User added successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error saving user", error: err.message });
  }
});

//Signin
app.post("/v1/signin", async(req,res)=>{
  try {
    const {emailId, password} = req.body;

    if(! emailId|| !password){
     return  res.status(400).json({
        success:false,
        message:"Email and Password are required"
      })
    }
    const user  =   await User.findOne({emailId});
    if(!user){
      return res.status(400).json({
        success:false,
        message:"Invalid email & password"
      })
    }

    if(user.password !== password){
      return res.status(401).json({
        success:false,
        message:"Invalid email or password"
      })
    }

    req.session.userId = user._id;
    req.session.emailId = user.emailId;
    req.session.firstName = user.firstName;
    req.session.lastName = user.lastName;
    req.session.role = user.role;

    res.status(200).json({
      loggedIn: true,
      message:"Login Successfull",
      sessionID: req.sessionID,
      data:{
        userId: user._id,
        emailId: user.emailId,
        role: user.role,
      }
    })
  } catch (error) {
   return  res.status(500).json({
    success:false,
    message: error.message
   })
  }
})

//logout
app.post("/v1/logout/", async(req,res)=>{
  req.session.destroy(err=>{
    if(err) return res.status(500).json({ success: false, message: err.message });
    res.clearCookie("seekvialove.sid");
    res.json({ success: true, message: "Logged out successfully" });
  })
})

//check session
app.get("/v1/checkSession", async (req, res) => {
  if (req.session.userId) {
    res.json({
      loggedIn: true,
      user: {
        firstName: req.session.firstName,
        userId: req.session.userId,
        emailId: req.session.emailId,
         lastName: req.session.lastName,
         role: req.session.role
      }
    });
  } else {
    res.json({ loggedIn: false });
  }
});

app.patch('/v1/infoUpdate/:userID', async (req, res) => {
  try {
    const userID = req.params.userID
    const data = req.body
    const allowedUpdate = ['birthPlace', 'birthTime', 'password'];
    const isUpdateAllowed = Object.keys(data).every((k) => allowedUpdate.includes(k));

    if (!isUpdateAllowed) {
      throw new Error("update not allowed")
    }
    const user = await User.findByIdAndUpdate(userID, data)
    res.send("user update successfully")
  } catch (error) {
    res.status(400).send("Update Failed" + error.message)
  }
})

app.get("/v1/serviceList", async (req, res) => {
  try {
    const data = await Service.find({})
    res.send(data)
  } catch (error) {
    res.status(500).send("something went wrong", error)
  }
});

app.post("/v1/serviceList", async (req, res) => {
  try {
    const service = new Service(req.body);
    await service.save();
    res.status(201).json({
      message: "Service added successfully",
      data: service,
    });
  } catch (error) {
    res.status(500).send("something went wrong", error.message)
  }
});

// ═══════════════════════════════════════════════════════
// BOOKINGS
// ═══════════════════════════════════════════════════════

app.post("/v1/booking", async (req, res) => {
  try {
     if (!req.session.userId) {
       return res.status(401).json({ success: false, message: "Please login first" });
     }

     const { serviceId } = req.body;

     if (!serviceId) {
       return res.status(400).json({
         success: false,
         message: "serviceId is required"
       })
     }

     const service = await Service.findById(serviceId)
     if(!service){
       return res.status(400).json({
         message:"service not found"
       })
     }

     const booking = await Booking.create({
       user: req.session.userId,
       service: serviceId
     })

     res.status(201).json({
       success: true,
       message: "Service booked successfully",
       data:booking
     });
   } catch (error) {
     res.status(500).json({
       success: false,
       message:"server error",
       error: error.message
     });
   }
})

app.get("/v1/booking", async(req,res)=>{
  try{
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }

    const bookings = await Booking.find({ user: req.session.userId })
                                  .populate("service");

    res.status(200).json({
      success:true,
      data:bookings
    })
  }catch(error){
    res.status(500).json({
      message:error.message
    })
  }
})

// 🔍 DEBUG: Check bookings by email (for debugging dtripti235@gmail.com issue)
app.get("/v1/debug/bookings-by-email/:email", async (req, res) => {
  try {
    const email = req.params.email;
    console.log("DEBUG /v1/debug/bookings-by-email - Email:", email);
    
    const user = await User.findOne({ emailId: email });
    if (!user) {
      console.log("DEBUG - User not found for email:", email);
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    console.log("DEBUG - Found user:", user._id, user.emailId);
    
    const bookings = await Booking.find({ user: user._id })
                                  .populate("service");
    
    console.log("DEBUG - Found bookings for user:", bookings.length);
    
    res.status(200).json({
      success: true,
      user: { id: user._id, email: user.emailId, firstName: user.firstName },
      bookingsCount: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error("DEBUG /v1/debug/bookings-by-email - Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
})

// 🔍 Check if user can review a specific booking
app.get("/v1/booking/:id/can-review", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }

    const booking = await Booking.findById(req.params.id).populate("service");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Check ownership
    const bookingUserId = booking.user?.toString();
    if (bookingUserId !== req.session.userId) {
      return res.status(403).json({
        success: false,
        canReview: false,
        reason: "You can only review your own booked sessions",
      });
    }

    // Check if completed by admin
    if (!booking.isCompleted) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: "You can review only after the admin marks your session as completed",
        isCompleted: false,
      });
    }

    // Check if already reviewed
    if (booking.isReviewed) {
      return res.status(200).json({
        success: true,
        canReview: false,
        reason: "You have already reviewed this session",
        isReviewed: true,
      });
    }

    // All checks passed - user can review
    res.status(200).json({
      success: true,
      canReview: true,
      booking: {
        id: booking._id,
        service: booking.service,
        isCompleted: booking.isCompleted,
        isReviewed: booking.isReviewed,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// USER
// ═══════════════════════════════════════════════════════

app.get("/v1/userList", async (req, res) => {
  const userEmail = req.body.emailId;
  try {
    const data = await User.find({
      emailId: userEmail,
    });
    res.send(data);
  } catch (err) {
    res.status(500).send("Something went wrong", err.message);
  }
});

app.get("/v1/getAllUserList", async (req, res) => {
  try {
    const data = await User.find({});
    res.send(data);
  } catch (err) {
    res.status(404).send("Something went wrong", err);
  }
});

app.delete("/v1/deleteUser", async (req, res) => {
  const UserId = req.body.userId;
  try {
    const user = await User.findByIdAndDelete(UserId);
    res.send(" user deleted");
  } catch (error) {
    res.status(404).send("Something went wrong", error);
  }
});

// ═══════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════

// ⭐ GET ALL REVIEWS (Public — with filtering & pagination)
app.get("/v1/reviews", async (req, res) => {
  try {
    const { serviceId, rating, mode, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter = {};
    if (serviceId) filter.service = serviceId;
    if (rating) filter.rating = Number(rating);
    if (mode) filter.mode = mode;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, totalCount] = await Promise.all([
      Review.find(filter)
        .populate("service", "title price image")
        .populate("user", "firstName emailId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(filter),
    ]);

    // Calculate average rating (overall, not just page)
    const aggregation = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } },
    ]);

    const avgRating = aggregation.length > 0 ? aggregation[0].avgRating.toFixed(1) : "0.0";
    const totalReviews = aggregation.length > 0 ? aggregation[0].totalReviews : 0;

    res.status(200).json({
      success: true,
      totalReviews,
      avgRating,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: reviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ POST review — only for the user's OWN completed booking
//    A user can only review a booking that:
//      1) belongs to them
//      2) has been marked as completed by admin
//      3) has not been reviewed yet
app.post("/v1/reviews", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const { bookingId, serviceId, message, rating, mode } = req.body;

    if (!serviceId || !message || !rating || !mode) {
      return res.status(400).json({ success: false, message: "serviceId, message, rating, and mode are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be 1-5" });
    }

    if (!["Chat", "Audio"].includes(mode)) {
      return res.status(400).json({ success: false, message: "Invalid mode. Must be Chat or Audio" });
    }

    // 🔍 Find the SPECIFIC booking and verify it belongs to this user
    let booking;
    if (bookingId) {
      // If bookingId is provided, find by ID
      booking = await Booking.findById(bookingId).populate("service");
    } else {
      // If bookingId is not provided, find the user's most recent completed, unreviewed booking for this service
      booking = await Booking.findOne({
        user: req.session.userId,
        service: serviceId,
        isCompleted: true,
        isReviewed: false
      }).sort({ createdAt: -1 }).populate("service");
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: "No reviewable booking found. Make sure the booking is completed and not yet reviewed." });
    }

    // 🔒 Ownership check: user can only review their OWN booking
    const bookingUserId = booking.user?.toString();
    if (bookingUserId !== req.session.userId) {
      return res.status(403).json({
        success: false,
        message: "You can only review your own booked sessions",
      });
    }

    // 🔗 Validate serviceId matches the booking's service
    if (booking.service._id.toString() !== serviceId) {
      return res.status(400).json({
        success: false,
        message: "Service ID does not match the booked service",
      });
    }

    // ⏳ Booking must be marked completed by admin
    if (!booking.isCompleted) {
      return res.status(400).json({
        success: false,
        message: "You can review only after the admin marks your session as completed",
      });
    }

    // 🚫 Booking must not already have a review
    if (booking.isReviewed) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this session",
      });
    }

    // ✅ Save review — link to specific booking
    const newReview = await Review.create({
      user: req.session.userId,
      service: serviceId,
      booking: booking._id,
      name: req.session.firstName,
      message,
      rating,
      mode,
    });

    // ✅ Mark THIS specific booking as reviewed
    booking.isReviewed = true;
    await booking.save();

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      data: newReview,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✏️ PATCH /v1/reviews/:id — Update own review
app.patch("/v1/reviews/:id", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const { message, rating, mode } = req.body;

    // Find review and verify ownership
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Handle both populated ({ _id, firstName }) and unpopulated (ObjectId) review.user
    const reviewUserId = review.user?._id ? review.user._id.toString() : review.user.toString();
    if (reviewUserId !== req.session.userId) {
      return res.status(403).json({ success: false, message: "You can only edit your own review" });
    }

    // Build update object (only allow specified fields)
    const updateFields = {};
    if (message !== undefined) updateFields.message = message;
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: "Rating must be 1-5" });
      }
      updateFields.rating = rating;
    }
    if (mode !== undefined) {
      if (!["Chat", "Audio"].includes(mode)) {
        return res.status(400).json({ success: false, message: "Invalid mode" });
      }
      updateFields.mode = mode;
    }

    const updatedReview = await Review.findByIdAndUpdate(req.params.id, updateFields, { new: true });

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: updatedReview,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🗑️ DELETE /v1/reviews/:id — Delete own review & reset THE SPECIFIC booking's isReviewed flag
app.delete("/v1/reviews/:id", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Handle both populated and unpopulated review.user
    const reviewUserId = review.user?._id ? review.user._id.toString() : review.user.toString();
    if (reviewUserId !== req.session.userId) {
      return res.status(403).json({ success: false, message: "You can only delete your own review" });
    }

    // 🔄 Reset THE SPECIFIC booking's isReviewed flag (using review.booking)
    if (review.booking) {
      await Booking.findByIdAndUpdate(review.booking, { isReviewed: false });
    } else {
      // Fallback for older reviews without booking ref
      await Booking.findOneAndUpdate(
        { user: review.user, service: review.service },
        { isReviewed: false }
      );
    }

    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN — REVIEW MANAGEMENT
// ═══════════════════════════════════════════════════════

// 👑 Admin: Get all reviews (with user details)
app.get("/v1/admin/reviews", async (req, res) => {
  try {
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

  
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, totalCount] = await Promise.all([
      Review.find()
        .populate("service", "name price")
        .populate("user", "firstName lastName emailId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Review.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      totalReviews: totalCount,
      data: reviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 👑 Admin: Delete any review
app.delete("/v1/admin/reviews/:id", async (req, res) => {
  try {
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Reset THE SPECIFIC booking's isReviewed flag (using review.booking)
    if (review.booking) {
      await Booking.findByIdAndUpdate(review.booking, { isReviewed: false });
    } else {
      // Fallback for older reviews without booking ref
      await Booking.findOneAndUpdate(
        { user: review.user, service: review.service },
        { isReviewed: false }
      );
    }

    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Review deleted by admin",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════
// ADMIN — BOOKINGS
// ═══════════════════════════════════════════════════════

app.get("/v1/admin/bookings", async (req, res) => {
  try {
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const bookings = await Booking.find()
      .populate("service")
      .populate("user");

    res.json({ success: true, data: bookings });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch("/v1/admin/booking/complete/:id", async (req, res) => {
   
  try {
    if (!req.session.userId || req.session.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: { isCompleted: true } }, 
      { new: true }
    ).populate("service").populate("user");

    res.json({
      success: true,
      message: "Completed ✅",
      data: booking,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



connectDb()
  .then(() => {
    console.log("db connected successfully");
    app.listen(7777, () => {
      console.log("hello");
    });
  })
  .catch((error) => {
    console.log("db connection failed", error);
  });
