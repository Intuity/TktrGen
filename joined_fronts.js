var async = require('async');
var bwip = require('bwip-js');
var csv = require('csv');
var fs = require('fs');
var handlebars = require('handlebars');
var PDFMerge = require('pdf-merge');
var wkpdf = require('wkhtmltopdf');

// Load the frontside background images
var front_bg_1 = fs.readFileSync(__dirname + '/Images/' + 'FrontOne.png').toString('base64');
var front_bg_2 = fs.readFileSync(__dirname + '/Images/' + 'FrontTwo.png').toString('base64');
var front_bg_3 = fs.readFileSync(__dirname + '/Images/' + 'FrontThree.png').toString('base64');
var front_bg_4 = fs.readFileSync(__dirname + '/Images/' + 'FrontFour.png').toString('base64');
var front_bgs = [front_bg_1, front_bg_2, front_bg_3, front_bg_4];
// Load the template
var front_template = handlebars.compile(fs.readFileSync('./joined_fronts.html').toString());

// Filepath
var front_path = __dirname + '/output/' + 'joined_fronts.pdf';

// Render and export the front of the ticket
wkpdf(
    front_template({
        front_background_1: front_bg_1,
        front_background_2: front_bg_2,
        front_background_3: front_bg_3,
        front_background_4: front_bg_4
    }),
    {
        output:         front_path,
        pageWidth:      '230.9mm',
        pageHeight:     '382.8mm',
        marginTop:      0,
        marginRight:    0,
        marginBottom:   0,
        marginLeft:     0,
        disableSmartShrinking:  true
    },
    function(err) {
        if(err) console.error(err);
    }
);