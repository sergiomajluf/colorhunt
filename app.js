
/**
 * Module dependencies.
 * There's nothing really special here
 */

var express = require('express');
var http = require('http');
var path = require('path');
var app = express();

// all environments
app.set('port', process.env.PORT || 3030); //connect to localhost:3030
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('view options', {layout: false});
  
  
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: 'toxic' }));
app.use(express.methodOverride());
app.use(app.router);
app.use(express.favicon(__dirname + '/public/img/favicon.ico')); 
app.use(require('stylus').middleware({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));
//var html_dir = './html/';

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
  app.locals.pretty = true;
}

require('./colorhunt')(app);

/*app.get('/about', function(req, res) {
    res.sendfile(html_dir + 'about.html');
});*/

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
