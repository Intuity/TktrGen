var async   = require('async');
var Tickets = require('./lib/ticket_gen');

// Setup any required paths
var template_dir = __dirname + '/Templates/';
var image_dir    = __dirname + '/Images/';

// Print an introduction
console.log("[TktrGen :: PDF Ticket Generation from HTML Templates]\n");
console.log("This tool offers an interactive console for generating");
console.log("PDF tickets from HTML templates. The tool will now ask");
console.log("a number of questions to configure the templating");
console.log("process. To accept the default option, just press enter");
console.log("without entering any other text.\n");

// Control entry of data
var prompts = [
    { key: "mode",       prompt: "Do you want to generate digital or printed tickets? (default: digital) ", valid: ["digital","printed"]},
    { key: "output_dir", prompt: "What output directory to you want to use? (default: output) "},
    { key: "csv_file",   prompt: "Which CSV file do you want to use as a source of data? (default: tickets.csv) "}
];
var parameters = {
    mode:       "digital",
    output_dir: "output",
    csv_file:   "tickets.csv"
};

// Declare the rendering function
var render_function = function() {
    // Create and setup an instance of rendering library
    var renderer = new Tickets();
    var normal_tkt = null;
    var output_dir = [__dirname, parameters.output_dir].join('/');
    console.log("Writing out tickets to %s", output_dir);
    renderer.set_output_dir(output_dir);

    // Set that matrix codes should be generated in QR format
    renderer.set_code_format('qr');

    if (parameters.mode == "digital") {
        // Set that QR codes should be generated in black
        renderer.set_code_colour(0, 0, 0);

        // Register any templates and accompanying images
        normal_tkt = renderer.register_single_sided_template(
            'normal_tkt',                   // Template key
            template_dir + 'digital.html',  // Path to HTML layout for the ticket
            '210.0mm', '297.0mm'            // Size of the ticket (width, height)
        );
        normal_tkt.register_image('biglogo',  image_dir + 'BigLogo.png' );

    } else if (parameters.mode == 'printed') {
        // Set that matrix codes should be generated in white
        renderer.set_code_colour(255, 255, 255);

        // Register any templates and accompanying images
        normal_tkt = renderer.register_single_sided_template(
            'normal_tkt',                           // Template key
            // template_dir + 'singles_front.html',    // Path to HTML layout for ticket's front
            template_dir + 'singles_back.html',     // Path to HTML layout for ticket's back
            '215.98mm', '76.03mm'                   // Size of the ticket (width, height)
        );
        normal_tkt.register_image('colour_backer',  image_dir + 'colour_backer.png' );
        normal_tkt.register_image('detail_overlay', image_dir + 'normal_overlay.png');

        // To allow randomisation of the colour backer, register for rendering callbacks
        normal_tkt.set_callback(function(template, ticket, index) {
            template.set_parameter('backer_left', ((Math.random() * 49.0) % 49) + '%');
            template.set_parameter('backer_top',  ((Math.random() * 22.0) % 22) + '%');
        });

    }

    // Load up any data required for these templates and run the rendering operation
    normal_tkt.load_data([__dirname, parameters.csv_file].join('/'), function(error) {
        renderer.render_template(normal_tkt, function(err) {
            process.exit();
        });
    });
};

// Interactive prompt
var stdin    = process.openStdin();
var callback = null;
stdin.addListener("data", function(raw) {
    var str_data = raw.toString().trim();
    if (callback != null) callback(str_data);
});

var i = -1;
async.whilst(
    function() { i++; return (i < prompts.length); },
    function(i_complete) {
        var prompt = prompts[i];
        console.log(prompt.prompt);
        callback = function(data) {
            if (data.length > 0) {
                if (prompt.valid != undefined && prompt.valid.indexOf(data.toLowerCase()) < 0) {
                    console.log("ERROR :: Invalid option provided for %s (%s)", prompt.key, prompt.valid.join(", "));
                    process.exit();
                }
                parameters[prompt.key] = data.toLowerCase();
            }
            return i_complete(null);
        };
    },
    function(err) {
        if (err) throw err;
        callback = null;
        // Now we have the parameters - render tickets
        render_function();
    }
);
