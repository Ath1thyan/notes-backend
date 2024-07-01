const mongoose = require("mongoose")

const Schema = mongoose.Schema;

const tripSchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: { type: [String], default: [] },
    isBookMarked: { type: Boolean, default: false },
    userId: { type: String, required: true },
    createdOn: { type: Date, default: Date.now() }
});

module.exports = mongoose.model('Trip', tripSchema);