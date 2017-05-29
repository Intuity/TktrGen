var async = require('async');
var csv = require('csv');
var fs = require('fs');
var nodemailer = require('nodemailer');
var htmlToText = require('nodemailer-html-to-text').htmlToText;
var sgTransport = require('nodemailer-sendgrid-transport');

/*var transport = nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   465,
    secure: true,
    pool:   true,
    auth:   {
        user:   '',
        pass:   ''
    }
});*/

var transport = nodemailer.createTransport(sgTransport({
    auth:   {
        api_user:   '',
        api_key:    ''
    }
}));

transport.use('compile', htmlToText());

// Read in the message template
var html_message = fs.readFileSync(__dirname + '/Templates/message.html');

async.waterfall([
    function(done) {
        var csv_data = fs.readFileSync(__dirname + '/tickets.csv');
        csv.parse(
            csv_data,
            {
                relax_column_count:     true
            },
            function(err, data) {
                if(err) return done(err);
                // Quickly check we have the correct columns
                var headings_row = data[2];
                var desired = ['Payment Reference','Ticket Reference','Salutation','Guest Fullname','Ticket Type','Addons','Guest Email'];
                for(var i = 0; i < desired.length; i++) {
                    if(headings_row[i] != desired[i]) {
                        return done(new Error('Mismatch in expected column headings'));
                    }
                }
                return done(null, data);
            }
        );
    },
    function(data, done) {
        var messages = [];
        for(var i = 3; i < data.length; i++) {
            if(!fs.existsSync(__dirname + '/digitals/ticket_' + (i - 3) + '.pdf')) {
                console.log('Ticket Absent!');
                continue;
            }
            var mail_message = {
                from:       "'An Event' <anevent@example.com>",
                to:         data[i][6],
                //to:         'prb38@cam.ac.uk',
                subject:    'An Event Digital Ticket',
                html:       html_message,
                attachments:    [
                    {
                        filename:   'ticket.pdf',
                        path:       __dirname + '/digitals/ticket_' + (i - 3) + '.pdf'
                    },
                    {
                        filename:   'Queue Map.png',
                        path:       __dirname + '/queue_map.png'
                    }
                ]
            };
            messages.push(mail_message);
        }
        console.log('Preparing to send %s messages', messages.length);
        // Work through all the messages to send
        async.whilst(
            function() { return (messages.length > 0); },
            function(complete) {
                console.log('Send');
                transport.sendMail(messages.shift(), function(err, info) {
                    console.log(info);
                    return complete(null);
                });
            },
            function(err) {
                return done(err);
            }
        );
    }
], function(err) {
    if(err) console.error("Error occurred:", err);
    else console.log("All done!");
});
