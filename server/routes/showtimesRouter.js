const express = require("express");

const router = express.Router();

const {
    createShowtime,
    getShowtimes,
    getShowtimeById,
    updateShowtimeSeatPrice,
    updateShowtime,
    deleteShowtime,
    showtimesIdSeatsController
} = require("../controllers/showtimesController");

const { userAuthMiddleware, adminAuthMiddleware } = require("../middleware/authMiddleware");

const requireAdmin = [userAuthMiddleware, adminAuthMiddleware(["admin"])];

router.post("/", ...requireAdmin, createShowtime);

router.get("/", getShowtimes);

router.patch("/:id/seats/:seatId/price", ...requireAdmin, updateShowtimeSeatPrice);

router.get("/:id", getShowtimeById);

router.patch("/:id", ...requireAdmin, updateShowtime);

router.delete("/:id", ...requireAdmin, deleteShowtime);

router.get('/:id/seats', showtimesIdSeatsController);

module.exports = router;