var Tickets = require('./lib/ticket_gen');

// Setup any required paths
var template_dir = __dirname + '/Templates/';
var image_dir    = __dirname + '/Images/';

// Create and setup an instance of rendering library
var renderer = new Tickets();
renderer.set_output_dir(__dirname + '/output');
renderer.set_working_dir(__dirname + '/singles');

// Register any templates and accompanying images
var normal_tkt = renderer.register_template(
    'normal_tkt',                           // Template key
    template_dir + 'singles_front.html',    // Path to HTML layout for ticket's front
    template_dir + 'singles_back.html',     // Path to HTML layout for ticket's back
    '215.98mm', '76.03mm'                   // Size of the ticket (width, height)
);
normal_tkt.register_image('colour_backer',  image_dir + 'colour_backer.jpg' );
normal_tkt.register_image('detail_overlay', image_dir + 'normal_overlay.png');

// Load up any data required for these templates and run the rendering operation
normal_tkt.load_data(__dirname + '/tickets.csv', function(error) {
    renderer.render_template(normal_tkt, function(err) {
        process.exit();
    });
});
