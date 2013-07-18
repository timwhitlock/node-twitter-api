/**
 * Example filters tweets via Streaming API.
 */


var client = require('../lib/twitter').createClient();

client.setAuth ( 
    'your consumer key',
    'your consumer secret', 
    'some access key',
    'some access secret' 
);


var num = 0,
    max = 10;

client.stream( 'statuses/filter', { track: '#sxsw' }, function( json, error ){
    if( err ){
        console.error('Stream error: ' + error);
        return;
    }
    var tweet = JSON.parse( json );
    if( tweet.text && tweet.user ){
        console.log( tweet.user.screen_name+': "'+tweet.text+'"');
        if( ++num === max ){
            console.log('----');
            client.abort();
        }
    }
} );


