const express = require("express");

const router = express.Router();

const {
    createScreen,
    getScreens,
    getScreenById,
    updateScreen,
    deleteScreen
} = require("../controllers/screensController");


router.post("/", createScreen);

router.get("/", getScreens);

router.get("/:id", getScreenById);

router.patch("/:id", updateScreen);

router.delete("/:id", deleteScreen);


module.exports = router;