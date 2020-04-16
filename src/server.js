const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const cors = require('cors');
const db = require('./index');
const multer = require('multer');

const imageStorage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, './uploads');
    },
    filename: function(req, file, cb){
        cb(null, Date .now() +'-'+ file.originalname + '.jpg');
    }
})

const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png'){
        cb(null, true);
    }else{
        cb(null, false);
    }
}

const upload = multer({
    storage: imageStorage,
    limits: {
        fileSize: 1024 * 1024 * 50
    },
    fileFilter: fileFilter
})

const storage = require('./storage');

mongoose.set('useCreateIndex', true);
mongoose.connect('mongodb+srv://aho:adnan123@db-syms8.mongodb.net/test?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology:true});

const app = express();
app.use(cors());
app.use('/uploads/',express.static('uploads'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


app.post('/newpost', upload.single('blobData'), async(req,res,next) => {
    let newpost = req.body;
    let user = await jwt.verify(newpost.token, 'secretkey');
    if(!user) {
        return res.status(400).json({
            title: "User error",
            error: "User does not exist or credentials are invalid"
        })
    }
    newpost.url = 'http://localhost:5000/' + req.file.path;
    newpost.postedBy = user.userId;
    
    let CreatePost = await db.Post.create(newpost);
    if(!CreatePost){
        return res.status(400).json({
            title: "Post could not be pusblished",
            error: CreatePost.error
        })
    }
    res.status(200).json({
        title: "Post published"
    })
})

app.post('/newcomment', async(req, res, next) => {
    let post = req.body.id
    let text = req.body.text;
    let token = req.body.token;
    let user = await jwt.verify(token, 'secretkey')
    console.log(user)
    const NewComment = new db.Comment({
        text: text,
        commentedBy: mongoose.Types.ObjectId(user.userId),
        postId: mongoose.Types.ObjectId(post),
        replays: null,
        parentId: null,
        posted_at: Date.now()
    })
    let posted = await NewComment.save()

    res.status(200).json(NewComment);
})

app.post('/register', async(req, res, next) => {
    const NewUser = new db.User({
        name: req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 10)
    })
    let AddUser = await NewUser.save()
    .catch(e => {
        return res.status(400).json({
            title: 'Error',
            error: 'Email is already in use. Try with different one'
        })
    });
    if(AddUser){
        return res.status(200).json({
            title: 'Registration success'
        })
    }
})

app.post('/login', async (req, res, next) => {
    let user = await db.User.findOne({email: req.body.email})
    .catch(e => {
        return res.status(500).json({
            title: 'Server error',
            error: e
        })
    });
    if(!user){
        return res.status(400).json({
            title: 'User not found',
            error: 'Invalid user or password'
        })
    }
    if(!bcrypt.compareSync(req.body.password, user.password)){
        return res.status(401).json({
            title: 'Login failed',
            error: 'Invalid user or password'
        })
    }

    let token = jwt.sign({ userId: user._id}, 'secretkey')
    
    if(!token){
        return res.status(500).json({
            title: 'Token failed',
            error: `Could not create token for user ${user.name}`
        })
    }

    res.status(200).json({
        title:"Login successful",
        token: token
    })
})

app.get('/user', async(req, res, next) => {    
    let UserJwt = await jwt.verify(req.headers.token, 'secretkey')
    if(!UserJwt){
        return res.status(400).json({
            title: 'Autorization failed',
            error: 'No user with specific token'
        })
    }

    let UserData = await db.User.findOne({_id: UserJwt.userId})
    .catch(e =>{
        return res.status(500).json({
            title: `Could not find user`,
            error: e
        })
    });
    return res.status(200).json({
        title: 'User grabbed',
        UserData: {
            email: UserData.email,
            name: UserData.name
        }
    })
})

app.get('/posts', async (req, res, next) => {
    const data = await db.Post.find({}).populate('postedBy', 'name email -_id')
    .catch(e => console.log({
        title: "Error in grabbing data from db",
        error: e
    }))
    res.send(data);
})

app.get('/details', async (req, res, next) => {
    const id = req.headers.id;
    const data = await db.Post.findOne({_id: id}).populate('postedBy', 'name email -_id')
    .catch(e => console.log({
        title: "Error in grabbing data from db",
        error: e
    }))
    res.send(data);
})

app.get('/comments', async(req, res, next) => {
    const id = req.headers.id;
    const data = await db.Post.findOne({_id: id}).populate('postedBy', '_id')
    .catch(e => console.log({
        title: "Error in grabbing data from db",
        error: e
    }))
    const comments = await db.Comment.find({postId: id}).lean().populate({path: 'replays', model: "Comment", populate:{path: 'commentedBy', select: 'name', model: 'User'}}).populate('commentedBy', 'name -_id')
    .catch(e => console.log({
        title: "Error in grabbing data from db",
        error: e
    }))
    res.status(200).json(comments)
})

app.get('/', (req, res, next) => {
    res.send("Hello World")
})
const port = process.env.PORT || 5000;

app.listen(port, () => (console.log(`Listening on port ${port}`)))