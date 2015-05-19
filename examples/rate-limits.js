/**
 * Example spanks API rate limit and shows how to get rate limit data from client
 */

var client = require('../lib/twitter').createClient();

client.setAuth ( 
    'your consumer key',
    'your consumer secret',
    'some access key',
    'some access secret'
);


// Page through followers - this will run out pretty quickly
var cursor = '-1';
function nextPage(){
    client.get( 'followers/ids', { cursor: cursor, screen_name: 'timwhitlock', skip_status: true }, function( page, error, status ){
        if( error ){
            if( 429 === status ){
                var resetTime = client.getRateLimitReset();
                console.error('Wait until '+ resetTime.toString() );
            }
        }
        else {
            console.log('OK: '+cursor+' -> '+page.ids.length+' followers' );
            cursor = page.next_cursor_str;

            var limit = client.getRateLimit();
            if( limit ){
                var remaining = client.getRateLimitRemaining();
                if( !remaining ){
                    console.log( 'No requests left. Next call will throw 429 .. you\'ll see' );
                }
                else {
                    console.log( remaining+' of '+limit+' requests remaining');
                }
            }
            cursor && nextPage();
        }
    } );
}
nextPage();
