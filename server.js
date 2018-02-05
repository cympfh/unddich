const http = require('http');
const app = http.createServer(handler);
const io = require('socket.io').listen(app);
const fs = require('fs');
const Twitter = require('twitter');
const YAML = require('yamljs');

const config = YAML.load('./config.yml');
const client = new Twitter(config.twitter);
var myself = null;


http.get('http://httpbin.org/ip', (response) => {
    let data = '';
    response.on('data', chunk => { data += chunk; });
    response.on('end', () => {
        myself = JSON.parse(data).origin;
        console.log(`I am ${myself}`);
        console.log(`Listen on ${myself}:${config.port}`);
    });
});

function handler(req, res) {
    fs.readFile("./index.html", (err, data) => {
        data = data.toString().replace(/@MYSELF/, `http://${myself}:${config.port}`);
        res.writeHead(200);
        res.end(data);
    });
}

function post(status) {
    client.post('statuses/update', {
        status: status
    }, (error, tweet, response) => {
        if (error) console.warn(error);
    });
}

function delete_post(id) {
    client.post(`statuses/destroy/${id}.json`, {
        id : id
    }, function(){});
}

function shuffle(str) {
    var chars = str.split('');
    for (var i = chars.length - 2; i >= 0; --i) {
        const j = i + 1;
        if (Math.random() < .3) {
            let tmp = chars[i];
            chars[i] = chars[j];
            chars[j] = tmp;
        }
    }
    return chars.join('');
}

var buf = [];

client.stream('user', {}, (stream) => {
    stream.on('data', (data) => {

        if (!data || !data.user || !data.text) return;

        const protected = data.user.protected && data.user.screen_name !== config.twitter.username;
        const dataset = protected ?
        {
            name: 'protected',
            id: 'protected',
            image: "https://pbs.twimg.com/profile_images/767182141893455872/Y1jUi5tF_400x400.jpg",
            source: 'twitter',
            text: 'protected'
        } : {
            name: data.user.name,
            id: data.user.screen_name,
            image: data.user.profile_image_url,
            source: data.source,
            text: data.text
        };

        buf.push(dataset);
        if (buf.length > 10) buf.shift();

        for (i in sockets) {
            sockets[i].emit('news', dataset);
        }
        if (data.user.screen_name === config.twitter.username &&
            (data.text[0] === '.' || data.text[0] === ':')) {
            setTimeout(delete_post, 20000, data.id_str);
        }
    });
});

app.listen(config.port);
console.log(`Listen on ${config.port}`);

var sockets = [];

io.sockets.on('connection', function (socket) {

    console.log('New socket');

    sockets.push(socket);
    for (var i in buf) { socket.emit('news', buf[i]); }  // emit recent data
    if (sockets.length > 100) sockets.shift();  // up to 100 users

    socket.on('post', function(data) {
        const text = shuffle(data.text);
        post('.' + text);
    });

    socket.on('tenkei', (data) => {
        const time = new Date().getTime().toString();
        const status = `:tenkei #${time}`;
        post(status);
    });

});
