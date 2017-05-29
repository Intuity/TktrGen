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
renderer.set_working_dir(__dirname + '/singles');

// Set that matrix codes should be generated in white
renderer.set_code_colour(255, 255, 255);

// Set that matrix codes should be generated in QR format
renderer.set_code_format('qr');

// Setup index offset so that file names don't overlap with parallel runs
var offset = parseInt(('offset' in proc_args) ? proc_args['offset'] : 0);
renderer.set_index_offset(offset);

// Register any templates and accompanying images
var normal_tkt = renderer.register_single_sided_template(
    'normal_tkt',                           // Template key
    // template_dir + 'singles_front.html',    // Path to HTML layout for ticket's front
    template_dir + 'singles_back.html',     // Path to HTML layout for ticket's back
    '215.98mm', '76.03mm'                   // Size of the ticket (width, height)
);
normal_tkt.register_image('colour_backer',  image_dir + 'colour_backer.png' );
normal_tkt.register_image('normal_overlay', image_dir + 'normal_overlay.png');
normal_tkt.register_image('vip_overlay',    image_dir + 'vip_overlay.png'   );

// To allow randomisation of the colour backer, register for rendering callbacks
normal_tkt.set_callback(function(template, ticket, index) {
    if (ticket.addons.indexOf('VIP') > 0) template.set_parameter('which_overlay', 'vip_overlay');
    else template.set_parameter('which_overlay', 'normal_overlay');
    template.set_parameter('backer_left', ((Math.random() * 95.0 ) % 95 ) + '%');
    template.set_parameter('backer_top',  ((Math.random() * 102.0) % 102) + '%');
});

// Load up any data required for these templates and run the rendering operation
var file_path = ('input' in proc_args) ? proc_args['input'] : 'tickets.csv';
if (file_path.indexOf('/') < 0) file_path = __dirname + '/' + file_path;
normal_tkt.load_data(file_path, function(error) {
    renderer.render_template(normal_tkt, function(err) {
        process.exit();
    });
});
