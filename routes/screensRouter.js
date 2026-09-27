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

const { userAuthMiddleware, adminAuthMiddleware  } = require('../middleware/authMiddleware');

router.use(userAuthMiddleware);


router.post("/",adminAuthMiddleware(['admin']), createScreen);

router.get("/", getScreens);

router.get("/:screenId/seats", getScreenSeats);
router.post("/:screenId/seats",adminAuthMiddleware(['admin']), createScreenSeat);

router.get("/:id", getScreenById);

router.patch("/:id", adminAuthMiddleware(['admin']),updateScreen);
router.delete("/:id", adminAuthMiddleware(['admin']),deleteScreen);


module.exports = router;