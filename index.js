const express = require("express");
const connectDb = require("./config/dbconfig");
const User = require("./models/user");
const Service = require("./models/services");
const Booking = require("./models/booking")
const cors = require("cors");
const session = require("express-session");

const app = express();

app.use(express.json());


app.use(
  cors({
    origin: "http://3.213.27.192:8080",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true, 
  })
);

app.use(
  session({
    name: "seekvialove.sid",
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
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



    res.status(200).json({
      message:"Login Successfull",
      data:{
        userId: user._id,
        emailId: user.emailId
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
         lastName: req.session.lastName 
      
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
