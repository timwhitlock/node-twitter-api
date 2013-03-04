/**
 * Example verifies OAuth credentials via REST API
 */


var client = require('../lib/twitter').createClient();

client.setAuth ( 
    'your consumer key',
    'your consumer secret', 
    'some access key',
    'some access secret' 
);

client.get( 'account/verify_credentials', { skip_status: true }, function( user, error, status ){
    console.log( user ? 'Authenticated as @'+user.screen_name : 'Not authenticated' );
} );


