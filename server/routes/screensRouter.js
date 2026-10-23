const express = require("express");

const router = express.Router();

const {
    createScreen,
    getScreens,
    getScreenById,
    updateScreen,
    deleteScreen,
    archiveScreen,
    restoreScreen,
    getScreenSeats,
    updateScreenSeatPricing,
    createScreenSeat
} = require("../controllers/screensController");

const { userAuthMiddleware, adminAuthMiddleware  } = require('../middleware/authMiddleware');

router.use(userAuthMiddleware);


router.post("/",adminAuthMiddleware(['admin']), createScreen);

router.get("/", getScreens);

router.get("/:screenId/seats", getScreenSeats);
router.patch("/:screenId/seats/:seatId/pricing", adminAuthMiddleware(['admin']), updateScreenSeatPricing);
router.post("/:screenId/seats",adminAuthMiddleware(['admin']), createScreenSeat);

router.get("/:id", getScreenById);

router.patch("/:id", adminAuthMiddleware(['admin']),updateScreen);
router.patch("/:id/archive", adminAuthMiddleware(['admin']), archiveScreen);
router.patch("/:id/restore", adminAuthMiddleware(['admin']), restoreScreen);
router.delete("/:id", adminAuthMiddleware(['admin']), deleteScreen);


module.exports = router;