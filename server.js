require('dotenv').config();

const express = require('express');
const app = express();
const fetch = require("node-fetch");
const qs = require('querystring');
const randomString = require('randomstring');
const session = require('express-session');
const request = require('request');

const port = process.env.PORT || 3000;

app.use(express.static('views'));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(
    session({
        secret: randomString.generate(),
        resave: false,
        saveUninitialized: false
    })
);

const checkLoginAndFetch = (req, res, path) => {
    if (!req.session.access_token) {
        res.redirect('/');
        return;
    }
    fetch(process.env.API_HOST + path, {
        method: 'get',
        headers: {
            'Authorization': `Bearer ${req.session.access_token}`,
        },
    })
    .then((result) => {
        return result.json();
    }).then(data => {
        res.status(200).send(data)
    })
}

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
                        redirect_uri: process.env.HOST + "/redirect",
                        state: req.session.csrf_string
                    })
            },
            (error, response, body) => {
                req.session.access_token = qs.parse(body).access_token;
                res.redirect(process.env.CLIENT_HOST);
            }
        );
    } else {
        res.redirect('/');
    }
});

app.get('/viewer', function (req, res) {
    checkLoginAndFetch(req, res, '/viewer');
});
app.get('/user/:login/organizations', function (req, res) {
    checkLoginAndFetch(req, res, '/user/'+req.params.login+'/organizations');
});
app.get('/organization/:organization', function (req, res) {
    checkLoginAndFetch(req, res, '/organization/' + req.params.organization);
});
app.get('/organization/:organization/users', function (req, res) {
    if(req.query.after){
        checkLoginAndFetch(req, res, '/organization/' + req.params.organization + '/users?after=' + req.query.after);
        return
    }
    checkLoginAndFetch(req, res, '/organization/' + req.params.organization + '/users');
});
app.get('/user/:login/contributions', function (req, res) {
    if (req.query.after) {
        checkLoginAndFetch(req, res, '/user/' + req.params.login + '/contributions?after=' + req.query.after);
        return
    }
    checkLoginAndFetch(req, res, '/user/' + req.params.login + '/contributions');
});
app.get('/organization/:organization/repositories', function (req, res) {
    checkLoginAndFetch(req, res, '/organization/' + req.params.organization + '/repositories');
});

app.listen(port, () => console.log('\nAuth Now Running on port:' + port));
