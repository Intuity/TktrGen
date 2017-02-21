var async = require('async');
var bwip = require('bwip-js');
var csv = require('csv');
var fs = require('fs');
var handlebars = require('handlebars');
var PDFMerge = require('pdf-merge');
var wkpdf = require('wkhtmltopdf');

// Filter only some tickets to be generated
var enable_ticket_filter = false;
var ticket_filter = [];

// Load the template
var template = handlebars.compile(fs.readFileSync('./digital.html').toString());
var biglogo = fs.readFileSync(__dirname + '/Images/' + 'BigLogo.png').toString('base64');

async.waterfall([
    // Load CSV file
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
                var desired = ['Payment Reference','Ticket Reference','Salutation','Guest Fullname','Ticket Type','Addons'];
                for(var i = 0; i < desired.length; i++) {
                    if(headings_row[i] != desired[i]) {
                        return done(new Error('Mismatch in expected column headings'));
                    }
                }
                return done(null, data);
            }
        );
    },
    // Generate PDFs
    function(tickets, done) {
        console.log('Started generating PDFs');
        var i = 2;
        var i_max = tickets.length;
        var perc = 0;
        async.whilst(
            function() { i++; return (i < i_max); },
            function(i_complete) {
                if(Math.floor((i / (tickets.length - 3)) * 100.0) >= (perc + 5.0)) {
                    perc = Math.floor((i / tickets.length) * 100.0);
                    console.log('Progress: %s %', perc);
                }
                
                var row = tickets[i];
                
                if(enable_ticket_filter && ticket_filter.indexOf(row[1]) < 0) {
                    return i_complete(null);
                }
                
                var details = {
                    ticket_type:    row[4],
                    guest_name:     row[2] + ' ' + row[3],
                    ticket_id:      row[1],
                    payment_id:     row[0],
                    addons:         (row.length >= 6) ? row[5] : undefined
                };
                
                var output_folder = __dirname + '/digitals/';
                build_ticket_sheet(output_folder, (i - 3), details, function(err) {
                    return i_complete(err);
                });
            },
            function(err) {
                if(!err) console.log('Finished generating PDFs');
                return done(err);
            }
        );
    }
], function(err) {
    if(err) console.error(err);
});

var hex_chars = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];

var build_ticket_sheet = function(folder_path, ticket_index, details, callback) {
    async.waterfall([
        // Build the aztec codes
        function(done) {
            var buff = new Buffer(details.ticket_id);
            var sum = 0;
            for(var j = 0; j < buff.length; j++) {
                sum += buff.readUInt8(j);
            }
            var mod_16  = hex_chars[(sum % 16)];
            var mod_23  = hex_chars[((sum % 23) % 16)];
            var mod_27  = hex_chars[((sum % 27) % 16)];
            var mod_31  = hex_chars[((sum % 31) % 16)];
            var code_text = buff.toString('hex') + mod_16 + mod_23 + mod_27 + mod_31;
            build_aztec_codes([code_text], done);
        },
        // Build the ticket details
        function(codes, done) {
            var ticket_type = 'Standard';
            if(details.addons != undefined) {
                if(details.addons.indexOf('Queue Jump') >= 0) ticket_type = 'Queue Jump';
                else if(details.addons.indexOf('VIP') >= 0) ticket_type = 'VIP';
                else if(details.addons.indexOf('Dining') >= 0) ticket_type = 'Dining';
            }
            
            var data = {
                'type_0'            : ticket_type,
                'aztec_0'           : codes[0].toString('base64'),
                'name_0'            : details.guest_name,
                'ticketid_0'        : details.ticket_id,
                'paymentid_0'       : details.payment_id,
                'biglogo'           : biglogo
            };
            
            return done(null, data);
        },
        function(data, done) {
            // Filepath
            var file_path = folder_path + 'ticket_' + ticket_index + '.pdf';
            // Render and export the back of the ticket
            wkpdf(
                template(data),
                {
                    output:         file_path,
                    pageSize:       'A4',
                    marginTop:      0,
                    marginRight:    0,
                    marginBottom:   0,
                    marginLeft:     0,
                    disableSmartShrinking:  false
                },
                function(err) {
                    return done(err, data);
                }
            );
        }
    ], function(err) {
        return callback(err);
    });
};

var build_aztec_codes = function(code_texts, callback) {
    var i = -1;
    var codes = [];
    async.whilst(
        function() { i++; return (i < code_texts.length); },
        function(i_complete) {
            bwip.toBuffer({
                bcid:           'azteccode',
                text:           code_texts[i],
                scale:          10,
                includeText:    false
            }, function(err, png) {
                if(err || !png) return i_complete(err);
                codes.push(png);
                return i_complete(null);
            });
        },
        function(err) {
            return callback(err, codes);
        }
    );
};