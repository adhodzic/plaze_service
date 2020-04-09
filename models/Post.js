const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('../models/User')

const postSchema = new Schema({
    title: {
        unique: true,
        type: String
    },
    user: String,
    //user: {type: Schema.Types.ObjectId, ref: 'User'},
    url: String,
    date: Date
})

const Post = mongoose.model('Post', postSchema)

module.exports = Post;