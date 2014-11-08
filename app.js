/**
 * Module dependencies.
 */

var express = require('express')
    , http = require('http')
    , googleapis = require('googleapis')
    , OAuth2Client = googleapis.OAuth2Client
    , gapi = require(__dirname+'/configuration/gapi.js').gapi
    , weather = require('weather-js')

// Use environment variables to configure oauth client.
// That way, you never need to ship these values, or worry
// about accidentally committing them
var oauth2Client = new OAuth2Client(gapi.client_id,
    gapi.client_secret, gapi.redirect_url);

var app = express();

// all environments
app.set('port', process.env.PORT || 8081);
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

var success = function (data) {
    console.log('success', data);
};
var failure = function (data) {
    console.log('failure', data);
};
var gotToken = function () {
    googleapis
        .discover('mirror', 'v1')
        .execute(function (err, client) {
            if (!!err) {
                failure();
                return;
            }
            console.log('mirror client', client);
            listTimeline(client, failure, success);
            subscribeLocation(client, failure, success);
	    //insertHello(client, failure, success);
        });
};

var subscribeLocation = function (client, errorCallback, successCallback) {
	
	client.mirror.subscriptions.insert({
		collection : "locations",
		callbackUrl : gapi.domain+"location"
	}).withAuthClient(oauth2Client)
	.execute(function (err, data) {
		if (!!err)
			errorCallback(err);
		else
			successCallback(data);
	});
};

// send a simple 'hello world' timeline card with a delete option
var insertHello = function (client, errorCallback, successCallback) {
    client
        .mirror.timeline.insert(
        {
            "text": "Hey! Remember you umbrella! Today is going to rain!",
            "menuItems": [
                {"action": "DELETE"}
            ]
        }
    )
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};

var listTimeline = function (client, errorCallback, successCallback) {
    client
        .mirror.timeline.list()
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};

var grabToken = function (code, errorCallback, successCallback) {
    oauth2Client.getToken(code, function (err, tokens) {
        if (!!err) {
            errorCallback(err);
        } else {
            console.log('tokens', tokens);
            oauth2Client.credentials = tokens;
            successCallback();
        }
    });
};

app.get('/', function (req, res) {
    if (!oauth2Client.credentials) {
        // generates a url that allows offline access and asks permissions
        // for Mirror API scope.
        var url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/glass.timeline https://www.googleapis.com/auth/glass.location'
        });
        res.redirect(url);
    } else {
        gotToken();
    }
    res.write('Glass Mirror API with Node');
    res.end();

});
app.get('/oauth2callback', function (req, res) {
    // if we're able to grab the token, redirect the user back to the main page
    grabToken(req.query.code, failure, function () {
        res.redirect('/');
    });
});

app.post('/location', function(req, res){
    console.log('location',req);
    	weather.find({search: req.query.longitude+','+req.query.latitude,degreeType: 'C'}, function(err,result){
	if(err)
		console.log(err);
	else{
		if(result.forecast[0].precip > 50){
		insertHello(client, failure, success);
	// send notification for tomorrow
		}
	}
});
	res.end();
});

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

