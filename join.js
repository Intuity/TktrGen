var async = require('async');
var fs = require('fs');
var PDFMerge = require('pdf-merge');
var spindrift = require('spindrift');

// List the directory
var files = fs.readdirSync(__dirname + '/output');
files = files.filter(function(a) {
    var start = (a.indexOf('tickets_') >= 0);
    var end = (a.indexOf('.pdf') >= 0);
    return (start && end);
});

// Sort the files
files.sort(function(a,b) {
    var a_int = parseInt(a.split('_')[1].split('.pdf')[0]);
    var b_int = parseInt(b.split('_')[1].split('.pdf')[0]);
    return (a_int - b_int);
});

// Form the merge list
var merge_files = [];
for(var i = 0; i < files.length; i++) merge_files.push(__dirname + '/output/' + files[i]);

if(merge_files.length < 2) {
    console.log('Too few files to merge');
    process.exit(0);
}

// Merge
var merge = new PDFMerge(merge_files);
merge
    .asNewFile(__dirname + '/output/' + 'all_tickets.pdf')
    .merge(function(err, result) {
        if(err) {
            console.error('An error occurred: ', err);
            return;
        } else {
            console.log('Merge successful! ' + result);
        }
    });