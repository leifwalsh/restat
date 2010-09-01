var
http = require('http'),
fs = require('fs'),
querystring = require('querystring'),
url = require('url'),
io = require('../Socket.IO-node/'),

send404 = function(res){
    res.writeHead(404);
    res.write('404');
    res.end();
},

getRoot = function(req, res) {
    var path = url.parse(req.url).pathname;
    if (path === '/') {
        path = './index.html';
    }
    try {
	var swf = path.substr(-4) === '.swf';
        var png = path.substr(-4) === '.png';
        var mimetype = 'text/html';
        if (swf) {
            mimetype = 'application/x-shockwave-flash';
        } else if (png) {
            mimetype = 'image/png';
        } else if (path.substr(-4) === '.css') {
            mimetype = 'text/css';
        } else if (path.substr(-3) === '.js') {
            mimetype = 'text/javascript';
        }
	res.writeHead(200, {'Content-Type': mimetype});

        var encoding = (swf || png) ? 'binary' : 'utf8';
	fs.readFile(__dirname + '/' + path, encoding, function(err, data) {
			if (!err) {
                            res.write(data, encoding);
                        } else {
                            console.log(err, data);
                        }
			res.end();
		    });
    } catch(e){
	send404(res);
    }
},

auth = 'HIDDEN_FROM_GIT',

getEcho = function(req, res) {
    console.log('echo');
    var target_uri = querystring.parse(url.parse(req.url).query).uri;
    var target_url = url.parse(target_uri);
    console.log(target_url);
    var secure = target_url.protocol === 'https:';
    var client = http.createClient(target_url.port || (secure ? 443 : 80),
                                   target_url.host, secure);
    var result = client.request('GET', target_url.path,
                                {'Host': target_url.host,
                                 'Authorization': 'Basic ' + auth});
    res.writeHead(200, {'Content-Type': 'application/json'});
    result.on('response', function(response) {
                  var body = '';
                  response.on('body', function(chunk) {
                                  res.write(chunk);
                              });
                  response.on('complete', function() {
                                  res.end();
                              });
              });
},

ioobj = undefined,

recvHook = function(req, res) {
    if (ioobj === undefined) {
        return false;  // not ready yet
    }

    console.log(req);

    return true;
},

server = http.createServer(function(req, res) {
    var uri = url.parse(req.url).pathname;
    if (uri.match(/^\/echo\/?$/)) {
        getEcho(req, res);
    } else if (uri.match(/(^\/(javascripts|stylesheets|images)|\/?$)/)) {
        getRoot(req, res);
    } else if (1 /* TODO: match github hook */) {
        recvHook(req, res);
    }
});

server.listen(8666, "127.0.0.1");
console.log('Server running at http://127.0.0.1:8666/');

ioobj = io.listen(server);

ioobj.on('connection', function(client) {
             // noop
         });
