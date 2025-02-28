const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

// Constants for timing
const OPEN_TIME = '53 13 * * *';  // 13:53 Bali time (5 minutes before first post)
const CLOSE_TIME = '3 14 * * *';   // 14:03 Bali time (1 minute after last action)

let appProcess = null;

function startApp() {
  console.log('🚀 Starting application...');
  // Start the Vite dev server
  appProcess = exec('npm run dev', {
    cwd: path.resolve(__dirname, '../..')
  });

  // Log output
  appProcess.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  appProcess.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  // Start the scheduler service
  exec('npm run scheduler', {
    cwd: path.resolve(__dirname, '../..')
  });
}

function stopApp() {
  if (appProcess) {
    console.log('🛑 Stopping application...');
    // Kill the process and all child processes
    process.platform === 'win32' ? exec('taskkill /F /T /PID ' + appProcess.pid) : process.kill(-appProcess.pid);
    appProcess = null;
  }
}

// Schedule app start
cron.schedule(OPEN_TIME, () => {
  console.log('⏰ Time to start the application');
  startApp();
}, {
  timezone: "Asia/Makassar"
});

// Schedule app stop
cron.schedule(CLOSE_TIME, () => {
  console.log('⏰ Time to stop the application');
  stopApp();
}, {
  timezone: "Asia/Makassar"
});

// Handle process termination
process.on('SIGTERM', stopApp);
process.on('SIGINT', stopApp);

console.log('🤖 Auto-scheduler service started');
console.log('📅 Will open app at 13:53 and close at 14:03 Bali time daily');