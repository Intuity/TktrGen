To execute this script requires:
• NodeJS to be installed, and 'npm install' to be run in the directory
• wkhtmltopdf to be installed - http://wkhtmltopdf.org
• pdftk to be installed - http://stackoverflow.com/questions/32505951/pdftk-server-on-os-x-10-11
• Export ticket report from system with the following columns:
    Payment ID, Ticket ID, Salutation, Fullname, Ticket Type, Addons
• Retain the top 3 header rows in the file
• Execute node ./index.js