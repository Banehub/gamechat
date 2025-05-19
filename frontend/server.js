const express = require('express');
const path = require('path');
const shell = require('shelljs');
const fs = require('fs-extra');
const app = express();
const PORT = process.env.PORT || 5000;

// Function to build the React app and move the dist folder
async function buildAndMoveDist() {
  console.log('Installing dependencies...');
  shell.cd('client');
  if (shell.exec('npm install').code !== 0) {
    shell.echo('Error: npm install failed');
    shell.exit(1);
  }

  console.log('Removing dist...');
  shell.rm('-rf', 'dist');  // This will work cross-platform

  console.log('Building the React app...');
  if (shell.exec('npm run build').code !== 0) {
    shell.echo('Error: React build failed');
    shell.exit(1);
  }
  shell.cd('..');

  console.log('Moving dist folder...');
  try {
    await fs.move('./client/dist', './dist', { overwrite: true });
    console.log('Successfully moved dist folder.');
  } catch (err) {
    console.error('Error moving dist folder:', err);
    shell.exit(1);
  }
}

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await buildAndMoveDist();
});
