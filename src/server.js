//Spremanje modula koje cemo koristiti u aplikaciji
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const cors = require('cors');
const db = require('./index');
const multer = require('multer');
const fs = require('fs')

//**Postavke za spremanje slika pomoću multer middelwarea**
//######################################################################################################
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
//#########################################################################################################

//Postavke mongoose modula te spajanje na bazu
mongoose.set('useCreateIndex', true);
mongoose.connect('mongodb+srv://aho:adnan123@db-syms8.mongodb.net/test?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology:true});

//Inicijalizacija express-a i dodatne postavke za njega
const app = express();
app.use(cors());
app.use('/uploads/',express.static('uploads'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.disable('etag');

function check(req,res,next){
    let token = req.headers.token || req.body.token
    jwt.verify(token, 'secretkey', (err,decoded) =>{
        if(err){
            return res.status(500).json({
                error:"Token expired"
            })
        }else{
            req.UserJwt = decoded;
            next();
        }
    })
}

if(process.env.NODE_ENV === 'production') {
    app.use(express.static(__dirname + '/public/'));

    app.get("/", (req, res) => res.sendFile(__dirname + '/public/index.html'))
}
/*Ruta koja kreira novi post tako sto spremi blobData kao sliku te kreira novi objekt u bazi
sa svim podatcima ukljucujuci url spremljene slike */
app.post('/newpost',check, async(req,res,next) => {
    let newpost = req.body;
    newpost.postedBy = req.UserJwt.userId;
    delete newpost["token"];
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

app.patch('/updatepost/:id',check, async(req, res, next) => {
    let newpost = req.body;
    delete newpost["token"];
    newpost.postedBy = req.UserJwt.userId;
    console.log(newpost)
    let id = mongoose.Types.ObjectId(req.params.id)
    let result = await db.Post.updateOne({_id: id},{ $set: newpost})
    res.status(200).json({
        title: "Post updated"
    })
})
/*Ruta za spremanje dodavanje novog komentara/odgovora.
Radi na principu da ako se u objektu koji je ruta primila nalazi podatak comment
to znaci da se dodaje novi odgovor na neki komentar.
Usuprotnom znamo da ne odgovaramo na ne komentar nego upravo dodajemo komentar na post */
app.post('/newcomment', async(req, res, next) => {
    let post = req.body.id
    let comment = req.body.comment
    let text = req.body.text;
    let token = req.body.token;
    let user = await jwt.verify(token, 'secretkey')
    if(comment){
        const NewReplay = new db.Comment({
            text: text,
            commentedBy: mongoose.Types.ObjectId(user.userId),
            postId: mongoose.Types.ObjectId(post),
            replays: [],
            parentId: comment,
            posted_at: Date.now()
        })
        let posted = await NewReplay.save()

        let query = { _id: comment };
        let update = await db.Comment.updateOne(query, { $push: { replays: posted._id} });
        res.status(200).json(update);
    }else{
        const NewComment = new db.Comment({
            text: text,
            commentedBy: mongoose.Types.ObjectId(user.userId),
            postId: mongoose.Types.ObjectId(post),
            replays: [],
            parentId: null,
            posted_at: Date.now()
        })
        let posted = await NewComment.save()
    
        res.status(200).json(posted);
    }
})

app.post('/delete_comment/:id', async(req, res)=>{
    let id = mongoose.Types.ObjectId(req.params.id);
    let comment = await db.Comment.findOne({_id: id})
    if(comment.replays.length <= 0){
        await db.Comment.deleteOne({_id: id})
    }else{
        await db.Comment.deleteMany({_id: {$in: comment.replays}})
        await db.Comment.deleteOne({_id: id})
    }

    res.json("OK")
})

app.post('/delete_post/:id', async(req, res)=>{
    let id = mongoose.Types.ObjectId(req.params.id);
    await db.Post.deleteOne({_id:id})
    await db.Comment.deleteMany({postId:id})
    res.json("OK")
})

/*Ruta za registraciju novog korisnika.
Trenutno jos nije implementirano da korisnik moze imati ulogu ali to nam je sljedeci zadatak */
app.post('/register', async(req, res, next) => {
    const NewUser = new db.User({
        name: req.body.username,
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

/*Ruta za prijavu korinsika. Koristimo JWT kao motodu autentifikacije korisnika.
Taj JWT kod se sprema na backendu i u njemu se nalaze podatci poput email-a prijavljene osobe te njezino ime.*/
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

    let token = jwt.sign({ userId: user._id}, 'secretkey',{ expiresIn:  "3h"} )
    
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

/*Ruta kojom dohvacamo korisnika iz baze podataka.
Na nacin da dekriptiramo JWT koji smo poslali u request te onda iz njega imamo informaciju o kojem se korisniku radi.*/
app.get('/api/user', check,  async(req, res, next) => {    
    let UserJwt = req.UserJwt
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
            name: UserData.name,
            id: UserData._id
        }
    })
})

app.patch('/update_user',async(req,res,next)=>{
    let token = req.body.headers.token;
    let userJwt = ''
    jwt.verify(token, 'secretkey', (err,decoded) =>{
        if(err){
            return res.status(500).json({
                error:"Token expired"
            })
        }else{
            userJwt = decoded;
        }
    })
    
    let UpdateUser = await db.User.updateOne({_id: userJwt.userId},{ $set: { "name": req.body.headers.username } })
    console.log("User Updated!");
    res.json("User Updated!")

})


app.patch('/get_password',async(req,res,next)=>{
    let token = req.body.headers.token;
    let userJwt = '';
    jwt.verify(token, 'secretkey', (err,decoded) =>{
        if(err){
            return res.status(500).json({
                error:"Token expired"
            })
        }else{
            userJwt = decoded;
        }
    })
    let User = await db.User.findOne({_id: userJwt.userId})
    .catch(e =>{
        return res.status(500).json({
            title: `Could not find user`,
            error: e
        })
    });
    console.log("Password: ",User.password)
    //Dohvatili smo lozinku, sada je moramo usporediti sa onom iz body-a

    if(!bcrypt.compareSync(req.body.headers.password, User.password)){
        res.json({
            title:'Incorrect Password!',
            check:false
        })
    }
    else{
        res.json({
            title:'Password Confirmed!',
            check:true
        })
    }
})

app.patch('/update_password',async(req,res,next)=>{
    let token = req.body.headers.token;
    let userJwt = ''
    let password = bcrypt.hashSync(req.body.headers.password, 10)
    jwt.verify(token, 'secretkey', (err,decoded) =>{
        if(err){
            return res.status(500).json({
                error:"Token expired"
            })
        }else{
            userJwt = decoded;
        }
    })
    
    let UpdateUser = await db.User.updateOne({_id: userJwt.userId},{ $set: { "password": password } })
    console.log("Password Updated!");
    res.json("Password Updated!")
})

app.post('/delete_account',async(req,res,next)=>{
    let token = req.body.headers.token;
    let userJwt = ''
    jwt.verify(token, 'secretkey', (err,decoded) =>{
        if(err){
            return res.status(500).json({
                error:"Token expired"
            })
        }else{
            userJwt = decoded;
        }
    })
    
    let deleteUser = await db.User.deleteOne({_id: userJwt.userId})
    console.log("Account Deleted!");
    res.json("Account Deleted!")
})

app.get('/posts/:id',async (req,res) =>{
    let id = mongoose.Types.ObjectId(req.params.id);
    let objava = await db.Post.findOne({_id:id})
    res.json(objava)
})

/*Ruta za dohvacanje svih postova. Trenutno jos nije implementirano pretrazivanje.
Te filtriranje postova koji nisu jos odobreni od strane administratora.*/
app.get('/posts', async (req, res, next) => {

    let query = req.query

    let selection = {}
    if(query.title){
        selection.title = new RegExp(query.title)
    }

    /* if(query.postedBy){
        selection.postedBy = new RegExp('^'+ query.postedBy,'i') // 'i' je da ne bude case sensitive
    }

    if(query._any){
        let pretraga = query._any
        let terms = pretraga.split(' ')

        let atributi = ['title','postedBy']

        selection={
            $and:[]
        }
        terms.forEach(term => {
            let or = {
                $or:[]
            }
            atributi.forEach(atribut => {
                or.$or.push({[atribut]:new RegExp(term)})
            });
            selection.$and.push(or);
        });
    } */




    const data = await db.Post.find(selection).populate('postedBy', 'name email -_id')
    .catch(e => console.log({
        title: "Error in grabbing data from db",
        error: e
    }))
    res.send(data);
})

//Ruta za dohvcanje detalja određenog posta
app.get('/details/:id', async (req, res, next) => {
    const id = req.params.id;
    const data = await db.Post.findOne({_id: id}).populate('postedBy', 'name email -_id')
    .catch(e => console.log({
        title: "Error in grabbing data from db",
        error: e
    }))
    res.send(data);
})

/*Ruta za dohvacanje kometara i odgovora.
Kasnije se na Clientu odvajaju komentrari od odogovra tako sto znamo da komentar nikada nece imat parentId.*/
app.get('/comments/:id', async(req, res, next) => {
    const id = req.params.id;
    const data = await db.Post.findOne({_id: id}).populate('postedBy', '_id')
    .catch(e => console.log({
        title: "Error in grabbing data from db",
        error: e
    }))
    const comments = await db.Comment.find({postId: id, parentId: null}).lean().populate({path: 'replays', model: "Comment", populate:{path: 'commentedBy', select:  'name', model: 'User'}}).populate('commentedBy', 'name _id')
    .catch(e => console.log({
        title: "Error in grabbing data from db",
        error: e
    }))
    res.status(200).json(comments)
})
const port = process.env.PORT || 3000;
app.listen(port, () => (console.log(`Listening on port ${port}`)))
