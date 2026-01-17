const mongoose = require("mongoose");

const connectDb = async () => {
  await mongoose.connect(
    "mongodb+srv://seekvialove:Init%401234@seekvialove.0y4ti6i.mongodb.net/SeekviaLove"
  );
};

module.exports =connectDb;


