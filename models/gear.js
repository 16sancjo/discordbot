const mongoose = require("mongoose");
const gearSchema = mongoose.Schema({
    userID: String,
    gearLink: String,
    ap: Number,
    aap: Number,
    dp: Number
});

module.exports = mongoose.model("Gear", gearSchema);