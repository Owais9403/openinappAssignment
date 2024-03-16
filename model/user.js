const mongoose = require("mongoose");
const usermodel = new mongoose.Schema({
    phone_number:{
        type:Number,
        maxlength: [10, "Number should be 10 digits"]
    },

    priority:{
        type:Number,
        enum: [0, 1,2,3],
        default:3

    },
})

module.exports = mongoose.model("User", usermodel);