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

/*
 * Twitter REST
 */

function post(status) {
    console.log(`Post ${status}`);
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

var _muted = [];
function is_muted(screen_name) {
    return _muted.indexOf(screen_name) >= 0;
};

function update_mute_list() {
    client.get('mutes/users/list.json?include_entities=false&skip_status=true', {}, (err, data) => {
        for (var i in data.users) { _muted[i] = data.users[i].screen_name; }
        console.log(`Mute: ${_muted}`);
    });
}

update_mute_list();
setInterval(update_mute_list, 30 * 60 * 1000);


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

// make a payload to emit
function package(data) {
    const protected = data.user.protected && data.user.screen_name !== config.twitter.username;
    const medias = data.entities && data.entities.media
        ? data.extended_entities.media.map(item => item.media_url) : [];
    const payload = protected ?
    {
        name: 'protected',
        id: 'protected',
        image: "https://pbs.twimg.com/profile_images/767182141893455872/Y1jUi5tF_400x400.jpg",
        source: 'twitter',
        text: 'protected'
    } : {
        name: data.user.name,
        id: data.user.screen_name,
        image: data.user.profile_image_url.replace('_normal', '_400x400'),
        source: data.source,
        text: data.text,
        medias: medias
    };
    return payload;
}

(function () {

    var buf = [];
    var sockets = [];
    var _last_time = (new Date()).getTime();

    var suicide = (reason) => {
        console.log(`Unexpected ${reason} happened. Good bye.`);
        process.exit();
    };

    // Twitter stream
    client.stream('user', {}, (stream) => {

        setInterval(() => {
            var now = (new Date()).getTime();
            var dmin = (now - _last_time) / 1000 / 60;
            if (dmin > 10) suicide('timeout');
        }, 60);
        console.log('ready');

        stream.on('data', (data) => {

            _last_time = (new Date()).getTime();
            if (!data || !data.user || !data.text) return;
            if (is_muted(data.user.screen_name)) return;

            let payload = package(data);
            buf.push(payload);
            if (buf.length > 10) buf.shift();

            // broadcasting
            for (i in sockets) { sockets[i].emit('news', payload); }

            // remove?
            if (data.user.screen_name === config.twitter.username &&
                (data.text[0] === '.' || data.text[0] === ':')) {
                const time = config.delete_sec;
                if (time > 0) {
                    console.log(`Deleting ${data.id_str} after ${time} sec`);
                    setTimeout(delete_post, time * 1000, data.id_str);
                }
            }

        });
    });

    // starting a server
    app.listen(config.port);
    console.log(`Listen on ${config.port}`);

    // web socket
    io.sockets.on('connection', function (socket) {

        console.log('New socket');

        sockets.push(socket);
        for (var i in buf) { socket.emit('news', buf[i]); }  // emit recent data
        if (sockets.length > 100) {
            sockets.shift();  // up to 100 users
            console.log('Unshift');
        }

        socket.on('post', function(data) {
            const text = shuffle(data.text);
            post('.' + text);
        });

        socket.on('tenkei', (data) => {
            const time = new Date().getTime().toString();
            const status = `:tenkei #${time}`;
            post(status);
        });

        socket.on('yuyushiki', (data) => {
            post('.ゆゆ式ガチャ');
        });

    });

}());
