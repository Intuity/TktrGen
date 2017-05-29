var Tickets = require('./lib/ticket_gen');

// Command line arguments
var proc_args = {};
var last_key  = null;
process.argv.forEach(function(val, index, array) {
    if (val.indexOf('-') >= 0) {
        // If key with no value detected, then just mark as 'true'
        if (last_key != null) proc_args[last_key] = true;
        // Remove leading '-' from key
        last_key = val.replace(/^[-]+/g, '');
    } else if (last_key != null) {
        // Link value to key
        proc_args[last_key] = val;
        last_key = null;
    }
});

// Pickup the last argument if it has no value
if (last_key != null) {
    proc_args[last_key] = true;
    last_key = null;
}

// Setup any required paths
var template_dir = __dirname + '/Templates/';
var image_dir    = __dirname + '/Images/';

// Create and setup an instance of rendering library
var renderer = new Tickets();
renderer.set_output_dir(__dirname + '/output');

// Set that QR codes should be generated in black
renderer.set_code_colour(0, 0, 0);

// Register any templates and accompanying images
var normal_tkt = renderer.register_single_sided_template(
    'normal_tkt',                   // Template key
    template_dir + 'digital.html',  // Path to HTML layout for the ticket
    '210.0mm', '297.0mm'            // Size of the ticket (width, height)
);
normal_tkt.register_image('biglogo',  image_dir + 'BigLogo.png' );

// Setup index offset so that file names don't overlap with parallel runs
var offset = parseInt(('offset' in proc_args) ? proc_args['offset'] : 0);
normal_tkt.set_index_offset(offset);

// Load up any data required for these templates and run the rendering operation
var file_path = ('input' in proc_args) ? proc_args['input'] : 'tickets.csv';
if (file_path.indexOf('/') < 0) file_path = __dirname + '/' + file_path;
normal_tkt.load_data(file_path, function(error) {
    renderer.render_template(normal_tkt, function(err) {
        process.exit();
    });
});
