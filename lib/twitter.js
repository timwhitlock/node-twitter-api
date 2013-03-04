/**
 * node-twitter-api
 * Twitter API 1.1 client for Node JS
 */


// pseudo constants
//
var TWITTER_API_TIMEOUT             = 5,
    TWITTER_API_USERAGENT           = 'Node/'+process.version.substr(1),
    TWITTER_API_BASE                = 'https://api.twitter.com/1.1';
    TWITTER_STREAM_BASE             = 'https://stream.twitter.com/1.1';
    TWITTER_OAUTH_REQUEST_TOKEN_URL = 'https://twitter.com/oauth/request_token';
    TWITTER_OAUTH_AUTHORIZE_URL     = 'https://twitter.com/oauth/authorize';
    TWITTER_OAUTH_AUTHENTICATE_URL  = 'https://twitter.com/oauth/authenticate';
    TWITTER_OAUTH_ACCESS_TOKEN_URL  = 'https://twitter.com/oauth/access_token';




/**
 * Simple token object that holds key and secret
 */
function OAuthToken( key, secret ){
    if( ! key || ! secret ){
        throw new Error('OAuthToken params must not be empty');
    }
    this.key = key;
    this.secret = secret;
}

OAuthToken.prototype.get_authorization_url = function(){
    return TWITTER_OAUTH_AUTHORIZE_URL+'?oauth_token='+encodeURIComponent(this.key);
}





/**
 * Object for compiling, signing and serializing OAuth parameters
 */
function OAuthParams( args ){
    this.consumer_secret = '';
    this.token_secret = '';
    this.args = args || {};
    this.args.oauth_version = this.args.oauth_version || '1.0';
    
}
    
OAuthParams.prototype.setConsumer = function( token ){
    this.consumer_secret = token.secret||'';
    this.args.oauth_consumer_key = token.key||'';
    return this;
}
   
OAuthParams.prototype.setAccess = function ( token ){
    this.token_secret = token.secret||'';
    this.args.oauth_token = token.key||'';
    return this;
}   
    
OAuthParams.prototype.normalize = function(){
    var i, k, keys = [], sorted = {};
    for( k in this.args ){
        keys.push(k);
    }
    keys.sort();
    for( i in keys ){
        k = keys[i];
        sorted[k] = this.args[k];
    }
    return this.args = sorted;
}    

OAuthParams.prototype.serialize = function(){
    return require('querystring').stringify( this.args );
}
    
OAuthParams.prototype.sign = function( requestMethod, requestUri ){
    var ms = Date.now(),
        s  = Math.round( ms / 1000 );
    this.args.oauth_signature_method = 'HMAC-SHA1';
    this.args.oauth_timestamp = String(s);
    this.args.oauth_nonce = String(ms);
    delete this.args.oauth_signature;
    // normalize, build and sign
    this.normalize();
    var str  = requestMethod.toUpperCase() +'&'+ encodeURIComponent(requestUri) +'&'+ encodeURIComponent(this.serialize()),
        key  = encodeURIComponent(this.consumer_secret) +'&'+ encodeURIComponent(this.token_secret),
        hash = require('crypto').createHmac('sha1',key).update(str);
    this.args.oauth_signature = hash.digest('base64');
    return this;
}

OAuthParams.prototype.getHeader = function(){
    var a, args = {}, lines = [];
    for( a in this.args ){
        if( 0 === a.indexOf('oauth_') ){
            lines.push( encodeURIComponent(a) +'='+ encodeURIComponent(this.args[a]) );
        }
        else {
            args[a] = this.args[a];
        }
    }
    this.args = args;
    return 'OAuth '+lines.join(',\n ');
}







/**
 * Twitter API 1.1 REST client
 */
function TwitterClient(){
    this.deAuth();
}

TwitterClient.prototype.setAuth = function( consumerKey, consumerSecret, accessKey, accessSecret ){
    this.consumerToken = new OAuthToken( consumerKey, consumerSecret );
    if( accessKey || accessSecret ){
        this.accessToken = new OAuthToken( accessKey, accessSecret );
    }
    else {
        this.accessToken   = null;
    }
    return this;
}

TwitterClient.prototype.hasAuth = function(){
    return ( this.accessToken instanceof OAuthToken ) && ( this.consumerToken instanceof OAuthToken );
}

TwitterClient.prototype.deAuth = function(){
    this.consumerToken = null;
    this.accessToken = null;
    return this;
}

TwitterClient.prototype.get = function( requestPath, requestArgs, callback ){
    return this._rest( 'GET', requestPath, requestArgs, callback );
}

TwitterClient.prototype.post = function( requestPath, requestArgs, callback ){
    return this._rest( 'POST', requestPath, requestArgs, callback );
}

TwitterClient.prototype._rest = function( requestMethod, requestPath, requestArgs, callback ){
    var requestUri = TWITTER_API_BASE + '/' + requestPath + '.json';
    return this.call( requestMethod, requestUri, requestArgs, function( res ) {
        // started to receive response from twitter
        res.setEncoding('utf8');
        var body = '';
        res.on('data', function( chunk ) {
            body += chunk;
        } );
        res.on('end', function(){
            try {
                var error = null,
                    data = JSON.parse(body);
                if( 'object' !== typeof data ){
                    throw { message: 'Malformed response from Twitter', code: 0 };
                }
                if( data.errors && data.errors.length ){
                    throw data.errors.pop();
                }
            }
            catch( e ){
                error = e;
                data = null;
                console.error( 'Twitter responded status '+res.statusCode );
                console.error( e.message || String(e) || 'Unknown error' );
            }
            if( 'function' === typeof callback ){
                callback( data, error, res.statusCode );
            }
        } );
    } );
}

TwitterClient.prototype.stream = function( requestPath, requestArgs, callback ){
    var requestMethod = 'GET',
        requestUri = TWITTER_STREAM_BASE+'/'+requestPath+'.json';
    if( 'user' === requestPath ){
        requestUri = requestUri.replace('stream','userstream');
    }
    else if( 'site' === requestPath ){
        requestUri = requestUri.replace('stream','sitestream');
    }
    else if( 0 === requestPath.indexOf('statuses/filter') ){
        requestMethod = 'POST';
    }
    if( 'function' !== typeof callback ){
        callback = function( json ){
            console.log( json );
        };
    }
    var client = this;
    return this.call( requestMethod, requestUri, requestArgs, function(res){
        client.response = res;
        res.setEncoding('utf8');
        if( 200 !== res.statusCode ){
            console.error( 'Error '+res.statusCode );
            client.abort();
        }
        res.on('data', function( chunk ) {
            // simple sniff for valid json and call back
            if( '{' == chunk.charAt(0) && '}\r\n' === chunk.substr(-3) ){
                callback( chunk );
            }
        } );
        res.on('end', function(){
            client.response = null;
        } );
    } );
}

TwitterClient.prototype.call = function( requestMethod, requestUri, requestArgs, callback ){
    if( ! this.hasAuth() ){
        throw new Error('Twitter client not authenticated');
    }
    requestMethod = String( requestMethod||'GET' ).toUpperCase();
    // build and sign request parameters
    var params = new OAuthParams( requestArgs )
         .setConsumer( this.consumerToken )
         .setAccess( this.accessToken )
         .sign( requestMethod, requestUri );
    // grab authorization header and any remaining params
    var oauth = params.getHeader(),
        query = params.serialize();
    // build http request starting with parsed endpoint
    var http = require('url').parse( requestUri );
    http.headers = { 
        Authorization: oauth,
        'User-Agent': TWITTER_API_USERAGENT 
    };
    if( 'POST' === requestMethod ){
        http.method = 'POST';
        http.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        http.headers['Content-Length'] = query.length;
    }
    else if( query ){
        http.path += '?' + query;
    }
    var req = require('https').get( http, callback );
    if( 'POST' === requestMethod && query ){
        req.write( query );
        req.write( '\n' );
    }
    req.end();
    return this;
}

TwitterClient.prototype.abort = function(){
    try {
        if( this.response ){
            this.response.destroy();
            this.response = null;
        }
    }
    catch( e ){
        console.error( e.message || String(e) || 'Unknown error on abort' );
    }
}








// export access to utils module

exports.createOAuthParams = function( args ){
    return new OAuthParams( args );
}


exports.createOAuthToken = function( key, secret ){
    return new OAuthToken( key, secret );
}


exports.createClient = function(){
    return new TwitterClient;
}
