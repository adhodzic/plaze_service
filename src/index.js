import express from 'express';
import storage from './storage.js'
import cors from 'cors'

const app = express()  // instanciranje aplikacije
const port = 3000  // port na kojem će web server slušati

app.use(cors())
app.use(express.json()) // automatski dekodiraj JSON poruke

app.post('/posts', (req, res) => {
    let data = req.body

    // ovo inače radi baza (autoincrement ili sl.), ali čisto za primjer
    data.id = 1 + storage.posts.reduce((max, el) => Math.max(el.id, max), 0)

    // dodaj u našu bazu (lista u memoriji)
    storage.posts.push(data)

    // vrati ono što je spremljeno
    res.json(data) // vrati podatke za referencu
})

app.get('/posts', (req, res) => {
    let posts = storage.posts
    let query = req.query
    
    if (query.title) {
        posts = posts.filter(e => e.title.indexOf(query.title) >= 0)
    }
    
    if (query.postedBy) {
        posts = posts.filter(e => e.postedBy.indexOf(query.postedBy) >= 0)
    }

    if (query._any) {
        let pretraga=query._any;
        let pojmovi = pretraga.split(" ");

        posts=posts.filter(post=>{
            let podaci = post.title + " " + post.postedBy;
            let rezultat = pojmovi.every(pojam=>{
                return podaci.indexOf(pojam) >= 0;
            })
            return rezultat;
        })
    }


    res.json(posts) // vraćamo postove direktno koristeći `json` metodu
});
    app.listen(port, () => console.log(`Slušam na portu ${port}!`))