require('dotenv').config();

const express = require('express');
const app = express();
const fetch = require("node-fetch");
const qs = require('querystring');
const randomString = require('randomstring');
const session = require('express-session');
const request = require('request');

const port = process.env.PORT || 5000;

app.use(express.static('views'));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", process.env.CLIENT_HOST);
    res.header("Access-Control-Allow-Credentials", true);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(
    session({
        secret: randomString.generate(),
        cookie: { maxAge: 60000 },
        resave: false,
        saveUninitialized: false
    })
);

app.get('/', (req, res, next) => {
    if (!req.session.access_token){
        res.status(403).json({ error: 'Please log in' });
        return;
    }
    res.status(200).send([{'token': req.session.access_token}]);
});

app.get('/login', (req, res, next) => {
    req.session.csrf_string = randomString.generate();
    const githubAuthUrl =
    'https://github.com/login/oauth/authorize?' +
    qs.stringify({
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.HOST + '/redirect',
        state: req.session.csrf_string,
        scope: 'repo user read:org'
    });
    
    res.redirect(githubAuthUrl);
});

app.get('/logout', (req, res, next) => {
    req.session.access_token = null;
    res.cookie('access_token', req.session.access_token, { maxAge: 0, httpOnly: true });
    res.redirect(process.env.CLIENT_HOST);
});

app.all('/redirect', (req, res) => {
    const code = req.query.code;
    const returnedState = req.query.state;
    if (req.session.csrf_string === returnedState) {
        request.post(
            {
                url:
                    'https://github.com/login/oauth/access_token?' +
                    qs.stringify({
                        client_id: process.env.CLIENT_ID,
                        client_secret: process.env.CLIENT_SECRET,
                        code: code,
                        redirect_uri: process.env.HOST  + "/redirect",
                        state: req.session.csrf_string
                    })
            },
            (error, response, body) => {
                req.session.access_token = qs.parse(body).access_token;
                res.cookie('access_token', req.session.access_token, { maxAge: 900000, httpOnly: true });
                res.redirect(process.env.CLIENT_HOST);
            }
        );
    } else {
        res.redirect('/');
    }
});

app.listen(port, () => console.log('\nAuth Now Running on port:' + port));
