var http = require('http')
  , path = require('path')
  , express = require('express')
  , gzippo = require('gzippo')
  , derby = require('derby')
  , app = require('../app')
  , serverError = require('./serverError')


// SERVER CONFIGURATION //

var expressApp = express()
  , server = http.createServer(expressApp)
  , store = derby.createStore({listen: server})

module.exports = server

// Turn on access control
store.accessControl = true;

require('./queries')(store);

var ONE_YEAR = 1000 * 60 * 60 * 24 * 365
  , root = path.dirname(path.dirname(__dirname))
  , publicPath = path.join(root, 'public')

expressApp
  .use(express.favicon())
  // Gzip static files and serve from memory
  .use(gzippo.staticGzip(publicPath, {maxAge: ONE_YEAR}))
  // Gzip dynamically rendered content
  .use(express.compress())

  // Uncomment to add form data parsing support
  .use(express.bodyParser())
  .use(express.methodOverride())

  // Uncomment and supply secret to add Derby session handling
  // Derby session middleware creates req.model and subscribes to _session
  .use(express.cookieParser())
  .use(store.sessionMiddleware({
    secret: process.env.SESSION_SECRET || 'YOUR SECRET HERE',
    cookie: {maxAge: ONE_YEAR}
  }))

  // Adds req.getModel method
  .use(store.modelMiddleware())
  // Creates an express middleware from the app's routes
  .use(app.router())
  .use(expressApp.router)
  .use(serverError(root))


// SERVER ONLY ROUTES //

expressApp.post('/', function( req, res, next ) {
  
  var
    model = req.getModel(),
    session = req.session;
  
  if( req.body.username === 'root' && req.body.password === 'root' ) {
    
    // Implement a fallback username and password to use as the first "user" that can subsequentially create new users
    session.access = true;
    
    res.redirect('/');
    
  } else {
    
    model.fetch(
        store.query('people').login(req.body),
        function( err, scoped_user ) {
          
          var
            scoped_user_get = scoped_user.get();
          
          if( typeof scoped_user_get !== 'undefined' ) {
            
            session.access = true;
            
          }
          
          res.redirect('/');
          
        }
      );
    
  }
  
});

expressApp.all('*', function(req) {
  throw '404: ' + req.url
})
