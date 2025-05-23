const express = require('express');
const bodyParser = require('body-parser');
// Middleware için
const session = require('express-session');
// mysql kütüphanesi. npm'den de indirilmeli (halihazırda indirili şu an)
const mysql = require('mysql2');
// Şifreleme kütüphanesi. Yine npm'den indirilmeli
const bcrypt = require('bcrypt');

const app = express();

app.use(express.json());

const dbConfig = {
    host: 'localhost',
    user: 'root', // Kullanıcı adınızı değiştirin
    password: 'Mustafa123.', // Şifrenizi ekleyin
    database: 'blog'
};

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'guvenli_anahtar',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static('public'));

const db = mysql.createConnection(dbConfig);

db.connect(err=> {
    if(err) throw err;
    console.log("mysql bağlı");
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/homepage.html');
  });
  

app.get('/posts', (req, res) => {
    db.query('SELECT * FROM posts' ,(err,results)=>{
        if (err) throw err;
        res.json(results); 
    });
});



app.post('/register' , (req,res) =>{
    const {username , password} = req.body;

    db.query('INSERT INTO users (username,password) values(?,?)' , [username,password],(err) =>{
        if(err){
            if(err.code=== 'ERR_DUP_ENTRY'){
                return res.send('Bu kullanıcı adı zaten kayıtlı.');
            }
            return res.send('Kayıt sırasında hata oluştu.');
        }
        res.redirect('/login.html');
    });
});

app.post('/login' ,(req,res) =>{
    const {username,password}= req.body;
    db.query('SELECT * FROM users WHERE username =?' , [username] , (err,results) =>{
        if(err) throw err;

        if(results.length>0 && results[0].password===password){
            req.session.user = {id:results[0].id , username:results[0].username};
            res.redirect('/homepage.html');
        }else{
            res.send('Kullanıcı adı veya şifre yanlış.');
        }
    });
});

app.get('/session-info' , (req,res) =>{
    if(req.session.user){
        res.json({
            loggedIn:true,
            user: {
                id: req.session.user.id,
                username: req.session.user.username
            }
        });
    }else{
        res.json({
            loggedIn:false
        });
    }
});


app.post('/add-post' , (req,res) =>{
    
    const {title , content , category} = req.body;

    const user = req.session.user;

    if(!user  ){
        return res.status(401).send("Giriş yapmadan yazı gönderemezsiniz");
    }

    

    const userId = user.id;

    const komut = 'INSERT INTO posts (user_id , title , content , category) VALUES (?,?,?,?)';
    
    db.query(komut , [userId , title , content , category]  , (err,results) => {
        if(err){
            console.error("Yazı eklenemedi" , err);
            return res.status(500).send("Sunucu hatası");
        }

        res.send("Yazı başarıyla yüklendi");

    });

});

app.get('/post/:id' , (req , res) => {
    const postId = req.params.id;

    const komut = 'SELECT posts.* , users.username FROM posts JOIN users ON posts.user_id = users.id WHERE posts.id=? ';

    db.query(komut, [postId] , (err,results) => {
        if(err){ 
            return res.status(500).send("Sunucu Hatası");
        }
        if(results.length ===0){
            return res.status(404).send("Yazı Bulunamadı");
        } 
        res.json(results[0]);
    });
});

app.put('/post/:id', (req,res)=>{
    const id = req.params.id;
    const {title , category , content} = req.body;

    const komut = ` UPDATE posts SET title=? , category=? , content =? WHERE id=? `;

    db.query(komut,[title,category,content,id] , (err, results) =>{
        if(err){
            console.error("Güncelleme hatası :" , err);
            return res.status(500).send("Güncelleme sırasında bir hata oluştu.");
        }
        res.send("Yazı başarıyla güncellendi.");
    });
} );

app.post('/like/:postId', (req,res) =>{
    const user = req.session.user; // sessiondan çektim
    const postId = req.params.postId; // urlden çektim

    if (!user) {
        return res.status(401).send("Giriş yapmalısınız.");
    }

    const userId = user.id;

    const komut = 'INSERT INTO likes (user_id, post_id) VALUES (?, ?)';

    db.query(komut, [userId, postId], (err) => {
        if (err) {
            // Kullanıcı daha önce beğendiyse hata verir
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).send("Zaten beğenmişsiniz.");
            }
            return res.status(500).send("Veritabanı hatası.");
        }

        res.send("Beğeni kaydedildi.");
    });
});

app.get('/likes/:postId' , (req,res) =>{
    const postId = req.params.postId;

    const komut = 'SELECT COUNT(*) AS likeCount FROM likes WHERE post_id = ?';

    db.query(komut , [postId] , (err,results) =>{
        if (err) return res.status(500).send("Veri alınamadı.");
        res.json(results[0]); // likeCount değeri burada gelir
    });

});

app.delete('/post/:id' , (req,res) => {
    const id = req.params.id;

    const komut = ` DELETE FROM posts WHERE id=?`;

    db.query(komut ,[id] , (err,results)=>{ 
        if (err) {
            console.error("Silme hatası:", err);
            return res.status(500).send("Yazı silinemedi.");
        }
        res.send("Yazı silindi.");
    });
});

app.get('/my-posts', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send("Giriş yapmalısınız.");
    }

    const userId = req.session.user.id;

    const komut = `
        SELECT * FROM posts 
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(komut, [userId], (err, results) => {
        if (err) return res.status(500).send("Veri alınamadı.");
        res.json(results);
    });
});


app.get('/logout' , (req,res)=>{
    req.session.destroy(err=>{
        res.redirect('/homepage.html')
    });
});


app.listen(3000,()=>{
    console.log("sunucu çalışıyor");
});
