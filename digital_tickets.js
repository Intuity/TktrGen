var Tickets = require('./lib/ticket_gen');

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

// Load up any data required for these templates and run the rendering operation
normal_tkt.load_data(__dirname + '/tickets.csv', function(error) {
    renderer.render_template(normal_tkt, function(err) {
        process.exit();
    });
});
