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
    // "https://seekvialove.com",
    "http://localhost:5173"
  ],
    methods: ["GET", "POST", "PUT", "DELETE","PATCH","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"],
    credentials: true, 
  })
);

// const corsOptions = {
//   origin: [
//     "http://3.213.27.192:7777",
//     "https://seekvialove.com"
//   ],
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"]
// };

// app.use(cors(corsOptions));




/* ✅ THEN USE CORS 
app.use(cors(corsOptions)); */



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
       sameSite: "none",

      /* required when sameSite none */
      secure: false, 
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);


//SignUp

app.post("/v1/signup", async (req, res) => {
  try {
    const { emailId } = req.body;
    const existingUser = await User.findOne({ emailId });

    if (existingUser) {
      // Stop execution after sending response
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

    console.log("req.body:", req.body);
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
      message:"Login Successfull",
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

// booking

app.post("/v1/booking", async (req, res) => {

  try {
  

     if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Please login first" });
    }

    const { serviceId } = req.body;

    if (!serviceId) {
      return res.status(400).json({
        success: false,
        message: "userId and serviceId are required"
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




// user

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
        .populate("service", "name price")
        .populate("user", "firstName")
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

// ✅ POST review (ONLY after booking completed — with duplicate guard)
app.post("/v1/reviews", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const { serviceId, message, rating, mode } = req.body;

    if (!serviceId || !message || !rating || !mode) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be 1-5" });
    }

    if (!["Chat", "Audio"].includes(mode)) {
      return res.status(400).json({ success: false, message: "Invalid mode. Must be Chat or Audio" });
    }

    // 🔍 Duplicate guard — check if user already reviewed this service
    const existingReview = await Review.findOne({
      user: req.session.userId,
      service: serviceId,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this service",
      });
    }

    // 🔍 Check if booking exists & completed & not yet reviewed
    const booking = await Booking.findOne({
      user: req.session.userId,
      service: serviceId,
      isCompleted: true,
      isReviewed: { $ne: true },
    });

    if (!booking) {
      return res.status(400).json({
        success: false,
        message: "You can review only after completing your booked session",
      });
    }

    // ✅ Save review
    const newReview = await Review.create({
      user: req.session.userId,
      service: serviceId,
      name: req.session.firstName,
      message,
      rating,
      mode,
    });

    // ✅ Mark booking reviewed
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

    if (review.user.toString() !== req.session.userId) {
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

// 🗑️ DELETE /v1/reviews/:id — Delete own review & reset booking isReviewed
app.delete("/v1/reviews/:id", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (review.user.toString() !== req.session.userId) {
      return res.status(403).json({ success: false, message: "You can only delete your own review" });
    }

    // Reset the associated booking's isReviewed flag
    await Booking.findOneAndUpdate(
      { user: review.user, service: review.service },
      { isReviewed: false }
    );

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

    // Reset the associated booking's isReviewed flag
    await Booking.findOneAndUpdate(
      { user: review.user, service: review.service },
      { isReviewed: false }
    );

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
    );

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
