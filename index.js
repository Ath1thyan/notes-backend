require("dotenv").config();

const config = require("./config.json");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const User = require("./models/usermodel");
const Trip = require("./models/tripmodel");
const { authenticateToken } = require("./utilities");

const app = express();

// Mongoose connection with error handling
mongoose.connect(config.connectionString)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => {
        console.error("Failed to connect to MongoDB", err);
        process.exit(1);
    });

app.use(express.json());
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
    res.json({ message: "Hello from the server!" });
});

// create account
app.post("/create-account", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName) {
        return res.status(400).json({ error: true, message: "Full name is required" });
    }
    if (!email) {
        return res.status(400).json({ error: true, message: "Email is required" });
    }
    if (!password) {
        return res.status(400).json({ error: true, message: "Password is required" });
    }

    try {
        const isUser = await User.findOne({ email });
        if (isUser) {
            return res.status(400).json({ error: true, message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            fullName,
            email,
            password: hashedPassword
        });
        await user.save();

        const accessToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "36000m" });

        res.json({ error: false, message: "User created successfully", accessToken });
    } catch (err) {
        console.error("Error creating account", err);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
});

// login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ error: true, message: "Email is required" });
    }
    if (!password) {
        return res.status(400).json({ error: true, message: "Password is required" });
    }

    try {
        const userInfo = await User.findOne({ email });
        if (!userInfo) {
            return res.status(400).json({ error: true, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, userInfo.password);
        if (!isMatch) {
            return res.status(400).json({ error: true, message: "Invalid credentials" });
        }

        const accessToken = jwt.sign({ userId: userInfo._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "36000m" });
        res.json({ error: false, message: "Logged in successfully", accessToken });

    } catch (err) {
        console.error("Error logging in", err);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
});

// Add trip
app.post("/add-trip", authenticateToken, async (req, res) => {
    const { title, content, tags } = req.body;

    if (!title) {
        return res.status(400).json({ error: true, message: "Title is required" });
    }
    if (!content) {
        return res.status(400).json({ error: true, message: "Content is required" });
    }

    try {
        // Retrieve userId from the authenticated token
        const userId = req.user.userId;
        console.log("Authenticated userId:", userId); // Add this line to debug

        const trip = new Trip({ title, content, tags: tags || [], userId });
        await trip.save();
        res.json({ error: false, message: "Trip added successfully" });
    } catch (err) {
        console.error("Error adding trip", err);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
});

// Edit trip
app.put("/edit-trip/:tripId", authenticateToken, async (req, res) => {
    const { title, content, tags, isBookMarked } = req.body;
    const tripId = req.params.tripId;
    const userId = req.user.userId; // Access userId directly from req.user

    if (!title && !content && !tags) {
        return res.status(400).json({ error: true, message: "No changes provided" });
    }

    try {
        const trip = await Trip.findOne({ _id: tripId, userId: userId });
        if (!trip) {
            return res.status(404).json({ error: true, message: "Trip not found" });
        }

        if (title) trip.title = title;
        if (content) trip.content = content;
        if (tags) trip.tags = tags;
        if (isBookMarked !== undefined) trip.isBookMarked = isBookMarked;
        await trip.save();

        res.json({ error: false, message: "Trip updated successfully", trip });
    } catch (err) {
        console.error("Error updating trip", err);
        return res.status(500).json({
            error: true,
            message: "Internal Server Error"
        });
    }
});

// Get all trips
app.get("/get-all-trips", authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    try {
        const trips = await Trip.find({ userId }).sort({ isBookMarked: -1 });
        res.json({ error: false, trips, message: "All trips retrieved successfully" });
    } catch (err) {
        console.error("Error getting all trips", err);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
});

// Delete Trip
app.delete("/delete-trip/:tripId", authenticateToken, async (req, res) => {
    const tripId = req.params.tripId;
    const userId = req.user.userId; // Access userId directly from req.user

    try {
        const trip = await Trip.findOneAndDelete({ _id: tripId, userId: userId });
        if (!trip) {
            return res.status(404).json({ error: true, message: "Trip not found" });
        }

        res.json({ error: false, message: "Trip deleted successfully" });
    } catch (err) {
        console.error("Error deleting trip", err);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
});

// Update isBookMarked
app.put("/update-bookmark/:tripId", authenticateToken, async (req, res) => {
    const tripId = req.params.tripId;
    const userId = req.user.userId; // Access userId directly from req.user
    const { isBookMarked } = req.body;

    try {
        const trip = await Trip.findOne(
            { _id: tripId, userId: userId },
        );

        if (!trip) {
            return res.status(404).json({ error: true, message: "Trip not found" });
        }

        // Update the isBookMarked field
        trip.isBookMarked = isBookMarked || false;
        await trip.save();

        res.json({
            error: false,
            message: "Bookmark updated successfully",
            trip
        });
    } catch (err) {
        console.error("Error updating bookmark", err);
        res.status(500).json({ error: true, message: "Internal Server Error" });
    }
});




app.listen(8000, () => {
    console.log("Server is running on port 8000");
});

module.exports = app;
