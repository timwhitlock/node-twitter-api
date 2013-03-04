/**
 * Example of starting OAuth flow by fetch a request token.
 */


var client = require('../lib/twitter').createClient();

client.setAuth ( 
    'your consumer key',
    'your consumer secret'
);

client.fetchRequestToken( 'oob', function( token, raw, status ){
    if( token ){
        console.log('Request secret: '+token.secret );
        console.log('Authorize at: '+ token.getAuthorizationUrl() );
    }
    else {
        console.error('Status '+status+', failed to fetch request token');
    }
} );