const express = require("express");
const connectDb = require("./config/dbconfig");
const User = require("./models/user");
const Service = require("./models/services");
const Booking = require("./models/booking")
const Review = require("./models/Review"); 
const cors = require("cors");
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();




// app.use(
//   cors({
//     origin: "http://3.213.27.192:8080",
//     methods: ["GET", "POST", "PUT", "DELETE","PATCH","OPTIONS"],
//     allowedHeaders: ["Content-Type","Authorization"],
//     credentials: true, 
//   })
// );

const corsOptions = {
  origin: "http://3.213.27.192:8080",
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","PATCH","OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization"
  ]
};



/* ✅ THEN USE CORS */
app.use(cors(corsOptions));



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

//reviews
// ⭐ GET ALL REVIEWS (Public)
app.get("/v1/reviews", async (req, res) => {
  try {

    const reviews = await Review.find()
      .populate("service", "name price") // get service name
      .populate("user", "firstName")     // get reviewer name
      .sort({ createdAt: -1 });

    // ⭐ Calculate average rating
    const totalReviews = reviews.length;
    const avgRating =
      totalReviews === 0
        ? 0
        : (
            reviews.reduce((acc, item) => acc + item.rating, 0) /
            totalReviews
          ).toFixed(1);

    res.status(200).json({
      success: true,
      totalReviews,
      avgRating,
      data: reviews,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// ✅ POST review (ONLY after booking completed)
app.post("/v1/reviews", async (req, res) => {
  try {
    // 🔐 Check login
    if (!req.session.userId) {
      return res.status(401).json({ message: "Login required" });
    }

    const { serviceId, message, rating, mode } = req.body;

    // 🧪 Basic validation
    if (!serviceId || !message || !rating || !mode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be 1-5" });
    }

   if (!["Chat", "Audio"].includes(mode)) {
  return res.status(400).json({ message: "Invalid mode" });
}

    // 🔍 Check if booking exists & completed
    const booking = await Booking.findOne({
      user: req.session.userId,
      service: serviceId,
      isCompleted: true,
      $or: [
    { isReviewed: false },
    { isReviewed: { $exists: false } }
  ]
    });

    if (!booking) {
      return res.status(400).json({
        message: "You can review only after completing your booked session",
      });
    }

    // ✅ Save review (FIXED ⭐)
    const review = await Review.create({
      user: req.session.userId,   // ⭐ IMPORTANT
      service: serviceId,         // ⭐ IMPORTANT
      name: req.session.firstName,
      message,
      rating,
      mode,
    });

    // ✅ Mark booking reviewed
    booking.isReviewed = true;
    await booking.save();

    res.status(201).json({
      message: "Review submitted successfully",
      data: review,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



//Admin

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
