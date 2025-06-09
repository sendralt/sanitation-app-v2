// openIndex.js
const path = require('path');

// Get the path to the index.html file
const filePath = path.resolve(__dirname, '../Public/index.html');

// Log the resolved file path
console.log('Resolved file path:', filePath);

// Dynamically import the open package
(async () => {
  try {
    const open = (await import('open')).default;
    await open(filePath);
    console.log('index.html should open in the default browser');
  } catch (err) {
    console.error('Error opening file:', err);
  }
})();




