/**
 * Example of getting application level bearer token, making an oauth 2 call, and invalidating afterwards.
 */


var consumerKey = 'your consumer key',
    consumerSec = 'your consumer secret';

var sys = require('sys'),
    client = require('../lib/twitter').createClient();

// OAuth 1a required to fetch bearer token.
client.setAuth ( consumerKey, consumerSec );

client.fetchBearerToken( function( bearer, raw, status ){

    if( ! bearer ){
        console.error('Status '+status+', failed to fetch bearer token');
        //console.error( sys.inspect(raw) );
        return;
    }

    client.setAuth( bearer );
    console.log( 'Have OAuth 2 bearer token: ' + bearer );

    // test a call with the new bearer token - show application rate limits for user methods
    client.get('application/rate_limit_status', { resources: 'users' }, function( data, error, status ){

        if( error ){
            console.error('Status '+status+', failed to fetch application rate limit status');
            //console.error( sys.inspect(error) );
            return;
        }

        console.log( sys.inspect(data.resources.users) );
    
        // back to OAuth 1 to invalidate
        client.setAuth ( consumerKey, consumerSec );
        console.log('Invalidating token ..' );
        client.invalidateBearerToken( bearer, function( nothing, raw, status ){
            if( 200 !== status ){
                console.error('Status '+status+', failed to invalidate bearer token');
                return;
            }
            console.log('Done.');
        } );
    } );
} );