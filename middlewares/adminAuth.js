const adminAuth = (req, res, next) => {
  if (!token === giveToken) {
    res.status(401).send("unauthorized access")
  }
  else{
    next();
  }
};

module.exports({
  adminAuth,
});
