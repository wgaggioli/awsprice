var express = require('express'),
    path = require('path'),
    curdir = path.join(process.cwd(), 'client'),
    port = 8080,
    app = express();

app.use(express.static(curdir));
app.get('*', function (req, res) {
  res.sendFile('index.html', {root: curdir});
});

app.listen(port, function() {
    console.log('Listening on http://127.0.0.1:%d', port);
});