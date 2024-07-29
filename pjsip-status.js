const fs = require('fs');
const path = require('path');

// Path to the Asterisk configuration file
const filePath = '/etc/asterisk/extensions.conf';

// Function to parse the [globals] section and filter softphones
function parseSoftphones(fileContent) {
    const globalsSection = '[globals]';
    const lines = fileContent.split('\n');
    let isInGlobalsSection = false;
    const softphones = {};

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if the line marks the start of the [globals] section
        if (trimmedLine.startsWith(globalsSection)) {
            isInGlobalsSection = true;
            continue;
        }

        // Check if the line marks the end of the section
        if (trimmedLine.startsWith('[') && trimmedLine !== globalsSection) {
            isInGlobalsSection = false;
        }

        if (isInGlobalsSection && trimmedLine && !trimmedLine.startsWith(';')) {
            const [key, value] = trimmedLine.split('=').map(part => part.trim());
            if (key && value) {
                // Assuming softphone variables have a specific prefix or naming convention
                // Modify the condition below as needed based on your naming convention
                if (key.startsWith('User')) {
                    softphones[key] = value;
                }
            }
        }
    }

    return softphones;
}

// Read the file and parse it
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error(`Error reading file: ${err.message}`);
        return;
    }

    const softphones = parseSoftphones(data);
    console.log('Softphones:', softphones);
});
