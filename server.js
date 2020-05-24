const http2 = require('http2');
const fs = require('fs');
const mime = require('mime');
const options = {
    key: fs.readFileSync('./ssl/example.com+5-key.pem'),
    cert: fs.readFileSync('./ssl/example.com+5.pem')
};

const server = http2.createSecureServer(options);
server.on('error', (err) => console.error(err));

function getHead(fd, path,callBack) {
    fs.fstat(fd, function (err,stat) {
        if (err) {
            stream.end('notFound');
            return;
        }
        const head = {
            'content-length': stat.size,
            'last-modified': stat.mtime.toUTCString(),
            'content-type': mime.getType(path)
        };
        callBack(head);
    });
}


function sendFile (stream, path) {
    fs.open(path, 'r', (err, fd) => {
        if (err) {
            stream.end('notFound');
            return;
        }
        try{
            getHead(fd, path,function (head) {
                stream.respondWithFD(fd, head, { waitForTrailers: false });
                stream.on('close', () => fs.closeSync(fd));
            });
        }catch (e) {
            console.log(e);
        }
    });
}
server.on('stream', (stream, headers) => {
    let path = headers[':path'];
    if (path === '/') {
        path = '/index.html';
    }
    path = '.' + path;
    sendFile(stream, path);
    // 当请求的是index.html， 把cook.js 推过去。
    if (path === './index.html') {
        // stream.pushStream({ ':path': '/cook.js' }) 这里的的path 是浏览器将会请求的文件地址。
        // 把它推给浏览器后，浏览器解析html 后请求cook.js 会发现自己已经有了就不在请求了。
        stream.pushStream({ ':path': '/cook.js' }, (err, pushStream, headers) => {
            if (err) throw err;
            sendFile(pushStream, './public/cook.js');
        });
        stream.pushStream({ ':path': '/styles.css' }, (err, pushStream, headers) => {
            if (err) throw err;
            sendFile(pushStream, './public/styles.css');
        });
    }
});

server.listen(8070,(err)=>{
    console.log("服务已经启动了")
});
