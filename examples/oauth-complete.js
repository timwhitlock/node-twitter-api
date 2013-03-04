/**
 * Example of completing OAuth flow by requesting access token from authorized request token
 */


var client = require('../lib/twitter').createClient();

client.setAuth ( 
    'your consumer key',
    'your consumer secret',
    'request token from step 1',  
    'request secret from step 1'
);

var verifier = 'PIN or code from user flow';

client.fetchAccessToken( verifier, function( token, raw, status ){
    if( token ){
        console.log('Credentials for @'+raw.screen_name );
        console.log(' > Access key:    '+token.key );
        console.log(' > Access secret: '+token.secret );
    }
    else {
        console.error('Status '+status+', failed to fetch access token');
    }
} );