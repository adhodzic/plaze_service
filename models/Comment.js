const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    text: String,
    postId: {
        type: Schema.Types.ObjectId, 
        ref: 'Post'
    },
    commentedBy: {
        type: Schema.Types.ObjectId, 
        ref: 'User'
    },
    replays: [
        {
            type: Schema.Types.ObjectId, 
            ref: 'Comment'
        }
    ],
    parentId: {
        type: Schema.Types.ObjectId, 
        ref: 'Comment'
    },
    posted_at: Date
})

const Comment = mongoose.model('Comment', commentSchema)

module.exports = Comment;