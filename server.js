const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const cors = require('cors');
const User = require('./models/User');
const Post = require('./models/Post');
const storage = require('./storage');

mongoose.set('useCreateIndex', true);
mongoose.connect('mongodb+srv://aho:adnan123@db-syms8.mongodb.net/test?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology:true});

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.post('/newpost', (req,res,next) => {
    const newPost = new Post()
    newPost.title = req.body.title,
    newPost.user.push(storage.user_id),
    newPost.url = req.body.url,
    newPost.date = Date.now()

    newPost.save(err => {
        if(err){
            return res.status(400).json({
                title: 'Error',
                error: 'Title is already in use. Try with different one'
            })
        }
        return res.status(200).json({
            title: 'Post has been published'
        })
    })
})

app.post('/register', (req, res, next) => {
    const newUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 10)
    })
    newUser.save(err => {
        if(err){
            return res.status(400).json({
                title: 'Error',
                error: 'Email is already in use. Try with different one'
            })
        }
        return res.status(200).json({
            title: 'Registration success'
        })
    })
})

app.post('/login', (req, res, next) => {
    User.findOne({email: req.body.email}, (err, user) => {
        if(err) return res.status(500).json({
            title: 'server error',
            error: err
        })
        if(!user) {
            return res.status(401).json({
            title: 'User not found',
            error: 'Invalid user or password'
            })
        }
        if(!bcrypt.compareSync(req.body.password, user.password)){
            return res.status(401).json({
                title: 'login failed',
                error: 'Invalid user or password'
            })
        }
        let token = jwt.sign({ userId: user._id}, 'secretkey');
        storage.user_id = user._id;
        return res.status(200).json({
            title: 'login success',
            token: token
        })
    })
})

app.get('/user', (req, res, next) => {
    let userToken = req.headers.token;
    
    jwt.verify(userToken, 'secretkey', (err, decoded) => {
        if(err) return res.status(401).json({
            title: "Unauthorised"
        })

        User.findOne({_id: decoded.userId}, (err, user) => {
            if(err) return console.log(err)
            return res.status(200).json({
                title: 'User grabbed',
                userData: {
                    email: user.email,
                    name: user.name
                }
            })
        })
    })
})

app.get('/', (req, res, next) => {
    res.send("Hello World")
})
const port = process.env.PORT || 5000;

app.listen(port, () => (console.log(`Listening on port ${port}`)))