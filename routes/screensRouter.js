const express = require("express");

const router = express.Router();

const {
    createScreen,
    getScreens,
    getScreenById,
    updateScreen,
    deleteScreen,
    getScreenSeats,
    createScreenSeat
} = require("../controllers/screensController");


router.post("/", createScreen);

router.get("/", getScreens);

router.get("/:id", getScreenById);

router.patch("/:id", updateScreen);

router.delete("/:id", deleteScreen);

router.get("/screens/:screenId/seats", getScreenSeats);

router.post("/screens/:screenId/seats", createScreenSeat);

module.exports = router;