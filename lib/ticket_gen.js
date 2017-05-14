var async = require('async');
var bwip = require('bwip-js');
var csv = require('csv');
var fs = require('fs');
var handlebars = require('handlebars');
var PDFMerge = require('pdf-merge');
var wkpdf = require('wkhtmltopdf');

module.exports = function() {

    // Used for tracking state of render
    var state = {
        templates:     {},
        configuration: {
            output_dir:  'output/',
            working_dir: 'singles/'
        }
    };

    // Function: set_output_dir
    this.set_output_dir = function(path) {
        state.configuration.output_dir = (path.charAt(path.length-1) == '/') ? path : (path + '/');
        // Check folder exists and create if not
        if (!fs.existsSync(path)) fs.mkdirSync(path);
    };

    // Function: set_working_dir
    this.set_working_dir = function(path) {
        state.configuration.working_dir = (path.charAt(path.length-1) == '/') ? path : (path + '/');
        // Check folder exists and create if not
        if (!fs.existsSync(path)) fs.mkdirSync(path);
    };

    // Function: register_template
    // Register a new template for use when rendering tickets
    this.register_template = function(template_key, front_path, back_path, width, height) {
        state.templates[template_key] = {
            'key'    : template_key,
            'front'  : handlebars.compile(fs.readFileSync(front_path).toString()),
            'back'   : handlebars.compile(fs.readFileSync(back_path ).toString()),
            'images' : {},
            'data'   : [],
            'size'   : {
                'width':  width,
                'height': height
            }
        };
        // Register any template functions
        // - Specify any images this template requires
        state.templates[template_key].register_image = (function(_template) {
            return function(image_key, image_path) {
                _template.images[image_key] = fs.readFileSync(image_path).toString('base64');
            };
        })(state.templates[template_key]);
        // - Specify the source of ticket data for this template
        state.templates[template_key].load_data = (function(_template) {
            return function(csv_path, done) {
                var raw_data = fs.readFileSync(csv_path);
                csv.parse(
                    raw_data,
                    { relax_column_count: true },
                    function(err, data) {
                        if(err) return done(err);
                        // Quickly check we have the correct columns
                        var headings_row = data[2];
                        var desired = ['Payment Reference','Ticket Reference','Salutation','Guest Fullname','Ticket Type','Addons'];
                        var columns = {};
                        // Find the column indices
                        for (var i = 0; i < desired.length; i++) {
                            var pos = headings_row.indexOf(desired[i]);
                            if (pos < 0) return done(new Error('Mismatch in expected column headings'));
                            columns[desired[i]] = pos;
                        }
                        // Build out the data
                        for(var i = 3; i < data.length; i++) {
                            var row = data[i];
                            var details = {
                                ticket_type: row[columns['Ticket Type']],
                                guest_name:  row[columns['Salutation']] + ' ' + row[columns['Guest Fullname']],
                                ticket_id:   row[columns['Ticket Reference']],
                                payment_id:  row[columns['Payment Reference']],
                                addons:      (row.length > columns['Addons']) ? row[columns['Addons']] : undefined
                            };
                            _template.data.push(details);
                        }
                        if(done) return done(null);
                    }
                );
            };
        })(state.templates[template_key]);
        // Return the template object
        return state.templates[template_key];
    };

    this.render_template = function(template, done) {
        var i             = -1;
        var last_reported = 0;
        console.log ("Beginning to generate tickets for template %s", template.key);
        async.whilst(
            function() { i++; return (i < template.data.length); },
            function(i_complete) {
                // Report progress
                if (Math.floor((i / template.data.length) * 100.0) >= (last_reported + 5.0)) {
                    last_reported = Math.floor((i / template.data.length) * 100.0);
                    console.log('Progress %s %', last_reported);
                }

                // Get the ticket to render
                var ticket = template.data[i];
                build_ticket_sheet(state.configuration.working_dir, template, ticket, i, i_complete);
            },
            function(err) {
                if(err) console.log("Ticket generation failed: %s", err);
                else console.log("Ticket generation completed successfully");
                return done(err);
            }
        );
    };

    var hex_chars = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];

    var build_ticket_sheet = function(folder_path, template, ticket, ticket_index, callback) {
        async.waterfall([
            // Build the aztec codes
            function(done) {
                var buff = new Buffer(ticket.ticket_id);
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
                if(ticket.addons != undefined) {
                    if     (ticket.addons.indexOf('Queue Jump') >= 0) ticket_type = 'Queue Jump';
                    else if(ticket.addons.indexOf('VIP')        >= 0) ticket_type = 'VIP';
                    else if(ticket.addons.indexOf('Dining')     >= 0) ticket_type = 'Dining';
                }
                
                var data = {
                    'type_0':           ticket_type,
                    'aztec_0':          codes[0].toString('base64'),
                    'name_0':           ticket.guest_name,
                    'ticketid_0':       ticket.ticket_id,
                    'paymentid_0':      ticket.payment_id
                };

                for (var img_key in template.images) {
                    data[img_key] = template.images[img_key];
                }
                
                return done(null, data);
            },
            // Export the front side
            function(data, done) {
                // Filepath
                var front_path = folder_path + 'ticket_front_' + ticket_index + '.pdf';
                // Render and export the front of the ticket
                wkpdf(
                    template.front(data),
                    {
                        output:                front_path,
                        pageWidth:             template.size.width,
                        pageHeight:            template.size.height,
                        marginTop:             0,
                        marginRight:           0,
                        marginBottom:          0,
                        marginLeft:            0,
                        disableSmartShrinking: true
                    },
                    function(err) {
                        return done(err, data);
                    }
                );
            },
            function(data, done) {
                // Filepath
                var back_path = folder_path + 'ticket_back_' + ticket_index + '.pdf';
                // Render and export the back of the ticket
                wkpdf(
                    template.back(data),
                    {
                        output:                back_path,
                        pageWidth:             template.size.width,
                        pageHeight:            template.size.height,
                        marginTop:             0,
                        marginRight:           0,
                        marginBottom:          0,
                        marginLeft:            0,
                        disableSmartShrinking: true
                    },
                    function(err) {
                        return done(err, data);
                    }
                );
            },
            // Merge the front and backside PDFs
            function(data, done) {
                var merge = new PDFMerge([
                    folder_path + 'ticket_front_' + ticket_index + '.pdf',
                    folder_path + 'ticket_back_' + ticket_index + '.pdf'
                ]);
                merge
                    .asNewFile(state.configuration.output_dir + 'ticket_' + ticket_index + '.pdf')
                    .merge(function(err, result) {
                        return done(err);
                    });
            }
        ], function(err) {
            return callback(err);
        });
    };

    // Function: build_aztec_codes
    //
    //  Build any number of PNG Aztec codes for strings passed in within
    //  the 'code_texts' array. This function is asynchronous, so will
    //  execute the provided 'callback' when complete.
    //
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

};