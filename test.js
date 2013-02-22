var app = require("http").createServer(handler),
    io = require("socket.io").listen(app),
    fs = require("fs"),
    twitter = require('ntwitter')

function handler (req, res) {
    fs.readFile("./index.html", function (err, data) {
        res.writeHead(200);
        res.end(data);
    });
}

var tw = new twitter({
    consumer_key: 'oAbnSSCx74rmQgBRP2ug',
    consumer_secret: 'U0CRnor8FrZVVjbrgqLFwhAi343VMgad11L00SRNss',
    access_token_key: '***',
    access_token_secret: '***' // naisho
});

var sockets = [];
var last = [];
function compose(data) {
    var obj = {
        name : data.user.name,
        id   : data.user.screen_name,
        image: data.user.profile_image_url,
        source: data.user.protected ? "鍵" : data.source,
        text : data.user.protected ? "鍵" : data.text };
    last.push(obj);
    last = last.slice(-10);
    return obj;
}
tw.stream('user',  function(stream) {
    stream.on('data', function(data) {
        if (!data || !data.user || !data.text) return;
        for (var i in sockets)
            sockets[i].emit("news", compose(data));
    });
});

app.listen(80);
io.sockets.on("connection", function (socket) {
    sockets.push(socket);
    for (var i=0;i<last.length;++i)
        socket.emit("news", last[i]);
    socket.on("post", function(data) {
        var text = isOK(data.text);
        if (!text) return;
        tw.post("http://api.twitter.com/1/statuses/update.json",
            {status : text},
            function(er, data) {
                if (er)
                    socket.emit("news",
                        { name:"home", id:"home",
                          image:"",
                          source:"localhost",
                          text:"an error occured. it may be \"User is over daily status update limit.\""})
            });
    });
});

function isOK(t) {
    // NG word!
    t = t.replace(/殺|爆|破|天|皇|死|総|理|人|罪|狙|撃|害|事|件|駅/g, "○");
    // shuffle!
    t =
        t.split("")
        .sort(function(){return Math.random() - .5})
        .join("");

    return t;
}
