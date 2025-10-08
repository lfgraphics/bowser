import { spawn } from 'child_process';
import { platform } from 'os';
import { resolve, join } from 'path';
import fs from 'fs';
import axios from 'axios';
import getPort from 'get-port';

const isWindows = platform() === 'win32';
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

let nextjsProcess = null;
let electronProcess = null;
let cleaned = false;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logNext(data) {
  const message = data.toString().trim();
  if (message) {
    log(`[Next.js] ${message}`, colors.cyan);
  }
}

function logElectron(data) {
  const message = data.toString().trim();
  if (message) {
    log(`[Electron] ${message}`, colors.magenta);
  }
}

async function waitForNextjs(maxRetries = 30) {
  log('⏳ Waiting for Next.js dev server to start...', colors.yellow);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const port = process.env.ELECTRON_NEXT_PORT || 3000;
      await axios.get(`http://localhost:${port}`);
      log('✅ Next.js dev server is ready!', colors.green);
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  log('❌ Next.js dev server failed to start in time', colors.red);
  return false;
}

async function startNextjs() {
  return new Promise((resolve, reject) => {
    log('🚀 Starting Next.js dev server...', colors.cyan);

    const cwd = process.cwd();
    const nextJsDirect = join(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');
    const nextBin = join(cwd, 'node_modules', '.bin', 'next');
    const nextBinCmd = join(cwd, 'node_modules', '.bin', 'next.CMD');
  const preferredPorts = Array.from({ length: 101 }, (_, i) => 3000 + i);
  const choosePort = async () => await getPort({ port: preferredPorts });
    
    (async () => {
      const port = await choosePort();
      process.env.ELECTRON_NEXT_PORT = String(port);

      if (fs.existsSync(nextJsDirect)) {
        nextjsProcess = spawn(process.execPath, [nextJsDirect, 'dev', '-p', String(port)], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: { ...process.env }
        });
      } else if (isWindows && fs.existsSync(nextBinCmd)) {
        nextjsProcess = spawn('cmd.exe', ['/d', '/s', '/c', nextBinCmd, 'dev', '-p', String(port)], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: { ...process.env }
        });
      } else if (fs.existsSync(nextBin)) {
        nextjsProcess = spawn(nextBin, ['dev', '-p', String(port)], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: { ...process.env }
        });
      } else {
        return reject(new Error('Next.js CLI not found. Did you run npm install?'));
      }

      nextjsProcess.stdout.on('data', logNext);
      nextjsProcess.stderr.on('data', logNext);

      nextjsProcess.on('error', (error) => {
      log(`❌ Failed to start Next.js: ${error.message}`, colors.red);
      reject(error);
      });

      nextjsProcess.on('exit', (code) => {
      if (code !== 0) {
        log(`❌ Next.js process exited with code ${code}`, colors.red);
      }
      });

      // Wait a bit then check if Next.js is ready
      setTimeout(async () => {
        const ready = await waitForNextjs();
        if (ready) {
          resolve();
        } else {
          reject(new Error('Next.js failed to start'));
        }
      }, 3000);
    })();
  });
}

function startElectron() {
  return new Promise((resolve, reject) => {
    log('⚡ Starting Electron...', colors.magenta);

    const cwd = process.cwd();
    const electronCli = join(cwd, 'node_modules', 'electron', 'cli.js');
    const electronBin = join(cwd, 'node_modules', '.bin', 'electron');
    const electronBinCmd = join(cwd, 'node_modules', '.bin', 'electron.CMD');

    if (fs.existsSync(electronCli)) {
      electronProcess = spawn(process.execPath, [electronCli, '.'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: { ...process.env, NODE_ENV: 'development', ELECTRON_NEXT_PORT: process.env.ELECTRON_NEXT_PORT }
      });
    } else if (isWindows && fs.existsSync(electronBinCmd)) {
      electronProcess = spawn('cmd.exe', ['/d', '/s', '/c', electronBinCmd, '.'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: { ...process.env, NODE_ENV: 'development', ELECTRON_NEXT_PORT: process.env.ELECTRON_NEXT_PORT }
      });
    } else if (fs.existsSync(electronBin)) {
      electronProcess = spawn(electronBin, ['.'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        env: { ...process.env, NODE_ENV: 'development', ELECTRON_NEXT_PORT: process.env.ELECTRON_NEXT_PORT }
      });
    } else {
      return reject(new Error('Electron CLI not found. Did you run npm install?'));
    }

    electronProcess.stdout.on('data', logElectron);
    electronProcess.stderr.on('data', logElectron);

    electronProcess.on('error', (error) => {
      log(`❌ Failed to start Electron: ${error.message}`, colors.red);
      reject(error);
    });

    electronProcess.on('exit', (code) => {
      log(`📴 Electron exited with code ${code}`, colors.yellow);
      cleanup();
    });

    resolve();
  });
}

function cleanup() {
  if (cleaned) return;
  cleaned = true;
  
  log('🧹 Cleaning up processes...', colors.yellow);
  
  if (nextjsProcess && !nextjsProcess.killed) {
    nextjsProcess.kill('SIGTERM');
  }
  
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill('SIGTERM');
  }
  
  process.exit(0);
}

// Handle cleanup on various exit signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`💥 Uncaught exception: ${error.message}`, colors.red);
  cleanup();
});

// Main execution
async function main() {
  try {
    log('🎯 Starting Tally Bridge Development Environment...', colors.bright);
    
    // Start Next.js first
    await startNextjs();
    
    // Give Next.js a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start Electron
    await startElectron();
    
    log('✨ Both servers are running! Ready for development.', colors.green);
    
  } catch (error) {
    log(`💥 Failed to start development environment: ${error.message}`, colors.red);
    cleanup();
  }
}

main();