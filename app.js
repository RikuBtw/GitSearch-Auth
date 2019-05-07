require('dotenv').config();

const express = require('express');
const app = express();
const qs = require('querystring');
const randomString = require('randomstring');

const port = process.env.PORT || 3000;

app.use(express.static('views'));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/login', (req, res, next) => {
    const csrf_string = randomString.generate();
    const githubAuthUrl =
    'https://github.com/login/oauth/authorize?' +
    qs.stringify({
        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.API_HOST + '/redirect?csrf=' + csrf_string,
        state: csrf_string,
        scope: 'repo user read:org'
    });
    
    res.redirect(githubAuthUrl);
});

app.listen(port, () => {
    console.log('Server listening at port ' + port);
});
