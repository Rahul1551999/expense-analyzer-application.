const express = require("express");
const router = express.Router();
const { getReports } = require("../controllers/reportController");
const auth = require("../middlewares/auth");

router.get("/", auth, getReports);

module.exports = router;
