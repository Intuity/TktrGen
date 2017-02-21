var async = require('async');
var bwip = require('bwip-js');
var csv = require('csv');
var fs = require('fs');
var handlebars = require('handlebars');
var wkpdf = require('wkhtmltopdf');

var template = handlebars.compile(fs.readFileSync('./index.html').toString());
//var background_img = fs.readFileSync('Background.png').toString('base64');

var aztec_codes = [];

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
        var i = -1;
        var i_max = Math.ceil((tickets.length - 3) / 4.0);
        var perc = 0;
        async.whilst(
            function() { i++; return (i < i_max); },
            function(i_complete) {
                if(Math.floor((i / tickets.length) * 400.0) >= (perc + 5.0)) {
                    perc = Math.floor((i / tickets.length) * 400.0);
                    console.log('Progress: %s %', perc);
                }
                
                var details = [];
                for(var j = 0; j < 4; j++) {
                    var k = (i * 4) + j + 3;
                    if(k >= tickets.length) continue;
                    var row = tickets[k];
                    details.push({
                        ticket_type:    row[4],
                        guest_name:     row[2] + ' ' + row[3],
                        ticket_id:      row[1],
                        payment_id:     row[0],
                        addons:         (row.length >= 6) ? row[5] : undefined
                    });
                }
                
                var output_file = __dirname + '/output/tickets_' + i + '.pdf';
                build_ticket_sheet(output_file, details, function(err) {
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

var build_ticket_sheet = function(filepath, details, callback) {
    async.waterfall([
        // Build the aztec codes
        function(done) {
            var code_texts = [];
            for(var i = 0; i < details.length; i++) {
                var buff = new Buffer(details[i].ticket_id);
                var sum = 0;
                for(var j = 0; j < buff.length; j++) {
                    sum += buff.readUInt8(j);
                }
                var mod_16  = hex_chars[(sum % 16)];
                var mod_23  = hex_chars[((sum % 23) % 16)];
                var mod_27  = hex_chars[((sum % 27) % 16)];
                var mod_31  = hex_chars[((sum % 31) % 16)];
                code_texts.push(buff.toString('hex') + mod_16 + mod_23 + mod_27 + mod_31);
            }
            build_aztec_codes(code_texts, done);
        },
        // Build the ticket sheet
        function(codes, done) {
            var data = [];
            for(var i = 0; i < details.length; i++) {
                var ticket_type = 'Standard';
                if(details[i].addons != undefined) {
                    if(details[i].addons.indexOf('Queue Jump') >= 0) ticket_type = 'Queue Jump';
                    else if(details[i].addons.indexOf('VIP') >= 0) ticket_type = 'VIP';
                    else if(details[i].addons.indexOf('Dining') >= 0) ticket_type = 'Dining';
                }
                
                data['type_' + i] = ticket_type;
                data['aztec_' + i] = codes[i].toString('base64');
                data['name_' + i] = details[i].guest_name;
                data['ticketid_' + i] = details[i].ticket_id;
                data['paymentid_' + i] = details[i].payment_id;
                //data['background'] = background_img;
            }
            rendered = template(data);
            wkpdf(
                rendered,
                {
                    output:         filepath,
                    pageSize:       'A4',
                    marginTop:      0,
                    marginRight:    0,
                    marginBottom:   0,
                    marginLeft:     0
                },
                function(err) {
                    return done(err);
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