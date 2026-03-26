const fs = require('fs');
const htmlText = fs.readFileSync('zapupi_debug.html', 'utf8');

const regexes = [
    /payment_data['"]\s*[:=]\s*['"]([^'"]+)/,
    /['"`](upi:\/\/pay\?[^'"`]+)['"`]/,
    /data-intent=['"]([^'"]+)/,
    /intent['"]?\s*:\s*['"]([^'"]+upi:\/\/[^'"]+)/,
    /upiString\s*=\s*['"]([^'"]+)/
];

let upiIntent = null;
for (const rx of regexes) {
    const match = htmlText.match(rx);
    if (match && match[1]) {
        upiIntent = match[1];
        console.log("MATCH FOUND:", upiIntent);
        break;
    }
}

if (!upiIntent) console.log("NO MATCHES");
