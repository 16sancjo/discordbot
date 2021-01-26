const mongoose = require("mongoose");
const gearSchema = mongoose.Schema({
    userID: String,
    userName: String,
    gearLink: String,
    ap: Number,
    aap: Number,
    dp: Number,
    color: String,
    bio: String
});

module.exports = mongoose.model("Gear", gearSchema);