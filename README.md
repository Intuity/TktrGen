# TktrGen

To execute this script requires:
- NodeJS to be installed, and 'npm install' to be run in the directory
- wkhtmltopdf to be installed - http://wkhtmltopdf.org
- pdftk to be installed - http://stackoverflow.com/questions/32505951/pdftk-server-on-os-x-10-11
- Export ticket report from system with the following columns:
  - Payment ID,
  - Ticket ID,
  - Salutation, 
  - Fullname,
  - Ticket Type,
  - Addons
- Retain the top 3 header rows in the file
- Execute 'node ./index.js'

What do various files do:

- 'index.js' - This sets up which ticket templates should be used, images required, and parameters such as the size of each ticket and the colour of the Aztec code. This is a good example of how to generate double sided tickets

- 'digital_tickets.js' - This sets up a single-sided template for producing digital tickets to email out.

- 'interactive.js' - Provides an interactive environment for building tickets, allowing the user to select between the printed or digital formats and specify a relative path to the input CSV file.

- 'lib/ticket_gen.js' - This library is what actually generates tickets. It requires you to define templates, and provide any required data/images by calling various functions. Then when you call 'render_template' it combines the data, templates and images to build out all of the required tickets.
