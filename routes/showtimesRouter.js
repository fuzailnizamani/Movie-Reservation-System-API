const express = require("express");

const router = express.Router();

const {
    createShowtime,
    getShowtimes,
    getShowtimeById,
    updateShowtime,
    deleteShowtime,
    showtimesIdSeatsController
} = require("../controllers/showtimesController");

router.post("/", createShowtime);

router.get("/", getShowtimes);

router.get("/:id", getShowtimeById);

router.patch("/:id", updateShowtime);

router.delete("/:id", deleteShowtime);

router.get('/:id/seats', showtimesIdSeatsController);

module.exports = router;