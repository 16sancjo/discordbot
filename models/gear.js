const mongoose = require("mongoose");
const gearSchema = mongoose.Schema( {
    _id: mongoose.Schema.Types.ObjectId,
    userID: String,
    gearLink: String
});

module.exports = mongoose.model("Gear", gearSchema);