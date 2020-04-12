const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    title: {
        unique: true,
        type: String
    },
    postedBy: {
        type: Schema.Types.ObjectId, 
        ref: 'User'
    },
    description: String,
    beach_type: String,
    lf_tower: String,
    pets_allowed_answer: String,
    free_beach: String,
    url: String,
    date: Date
})

const Post = mongoose.model('Post', postSchema)

module.exports = Post;