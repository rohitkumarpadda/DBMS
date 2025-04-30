const { exec } = require('child_process');

// Paths to frontend and backend folders
const frontendPath = './frontend';
const backendPath = './backend';

// Command to start the frontend
const startFrontend = `start cmd.exe /K "cd ${frontendPath} && npm run dev"`;

// Command to start the backend
const startBackend = `start cmd.exe /K "cd ${backendPath} && npm start"`;

// Execute the commands
exec(startFrontend, (err, stdout, stderr) => {
	if (err) {
		console.error('Error starting frontend:', err);
		return;
	}
	console.log('Frontend started:', stdout);
});

exec(startBackend, (err, stdout, stderr) => {
	if (err) {
		console.error('Error starting backend:', err);
		return;
	}
	console.log('Backend started:', stdout);
});
