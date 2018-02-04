#! /usr/local/bin/node

var app = require("http").createServer(handler)
  , io = require("socket.io").listen(app)
  , fs = require("fs")
  , twitter = require('ntwitter')
  , tw = new twitter(require("./token.js").us.unddich)
  , sockets = []
  ;

function handler(req, res) {
  fs.readFile("./unddich.html",function(err, data) {
    res.writeHead(200);
    res.end(data);
  })
}

function deleteTw(id) {
  tw.post("https://api.twitter.com/1.1/statuses/destroy/"+id+".json",
           {id : id}, function(){});
}

tw.stream('user',  function(stream) {
  stream.on('data', function(data) {
    if (!data || !data.user || !data.text) return;
    var dataset = {
          name  : data.user.name
        , id    : data.user.screen_name
        , image : data.user.profile_image_url
        , source: data.user.protected
                  && data.user.screen_name!="unddich"
                  ? "鍵" : data.source
        , text  : data.user.protected
                  && data.user.screen_name!="unddich"
                  ? "鍵" : data.text
        };
    for (i in sockets)
      sockets[i].emit("news", dataset);
    if (data.user.screen_name == "unddich"
        && data.text[0] == '.')
      setTimeout(deleteTw, 20000, data.id_str);
  });
});

app.listen(80);
io.sockets.on("connection", function (socket) {
    sockets.push(socket);
    socket.on("post", function(data) {
      text =
        data.text
            .split("")
            .sort(function(){return Math.random() - .97})
            .join("")
      tw.post("http://api.twitter.com/1/statuses/update.json",
              {status:text}, function(){});
    });
    socket.on("tenki", function(data) {
      tw.post("http://api.twitter.com/1/statuses/update.json",
              {status:".tenki"}, function(){});
    });
    socket.on("tenkei", function(data) {
      tw.post("http://api.twitter.com/1/statuses/update.json",
              {status:".tenkei"}, function(){});
    });
});
