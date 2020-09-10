const mongoose = require("mongoose");
const gearSchema = mongoose.Schema( {
    userID: String,
    gearLink: String
});

module.exports = mongoose.model("Gear", gearSchema);