const { spawn } = require('child_process');
const net = require('net');

class SimpleStartupManager {
  constructor() {
    this.backendProcess = null;
    this.frontendProcess = null;
    this.isShuttingDown = false;
    this.backendPort = 5000;
    this.frontendPort = 3000;
  }

  // Check if a port is available
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close();
        resolve(true);
      });
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  // Find an available port starting from the given port
  async findAvailablePort(startPort) {
    let port = startPort;
    while (!(await this.isPortAvailable(port))) {
      port++;
    }
    return port;
  }

  // Start the backend server
  async startBackend() {
    console.log('🚀 Starting simple backend server...');
    
    // Check if default port is available, if not find another
    if (!(await this.isPortAvailable(this.backendPort))) {
      this.backendPort = await this.findAvailablePort(this.backendPort + 1);
      console.log(`⚠️  Port 5000 is in use, using port ${this.backendPort} instead`);
    }
    
    // Set the port environment variable
    process.env.PORT = this.backendPort;
    
    this.backendProcess = spawn('node', ['server-simple.js'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PORT: this.backendPort }
    });

    this.backendProcess.on('error', (error) => {
      console.error('❌ Backend failed to start:', error);
      this.cleanup();
    });

    this.backendProcess.on('exit', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        console.error(`❌ Backend exited with code ${code}`);
        this.cleanup();
      }
    });

    // Wait a bit for backend to start
    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.startFrontend();
      }
    }, 3000);
  }

  // Start the frontend React app
  async startFrontend() {
    console.log('🌐 Starting frontend application...');
    
    // Check if default frontend port is available
    if (!(await this.isPortAvailable(this.frontendPort))) {
      this.frontendPort = await this.findAvailablePort(this.frontendPort + 1);
      console.log(`⚠️  Port 3000 is in use, using port ${this.frontendPort} instead`);
    }
    
    // Set environment variables for the frontend
    const frontendEnv = {
      ...process.env,
      PORT: this.frontendPort,
      REACT_APP_API_URL: `http://localhost:${this.backendPort}`
    };
    
    this.frontendProcess = spawn('npm', ['start'], {
      cwd: './client',
      stdio: 'inherit',
      shell: true,
      env: frontendEnv
    });

    this.frontendProcess.on('error', (error) => {
      console.error('❌ Frontend failed to start:', error);
      this.cleanup();
    });

    this.frontendProcess.on('exit', (code) => {
      if (code !== 0 && !this.isShuttingDown) {
        console.error(`❌ Frontend exited with code ${code}`);
        this.cleanup();
      }
    });

    // Display URLs after a short delay
    setTimeout(() => {
      console.log('\n🎉 Application started successfully!');
      console.log(`📊 Backend API: http://localhost:${this.backendPort}`);
      console.log(`🌐 Frontend: http://localhost:${this.frontendPort}`);
      console.log(`🔗 Health check: http://localhost:${this.backendPort}/health`);
      console.log(`⚠️  Running in simple mode with mock data`);
      console.log('\nPress Ctrl+C to stop all services\n');
    }, 5000);
  }

  // Cleanup function to stop all processes
  cleanup() {
    this.isShuttingDown = true;
    
    if (this.backendProcess) {
      console.log('🛑 Stopping backend...');
      this.backendProcess.kill('SIGTERM');
    }
    
    if (this.frontendProcess) {
      console.log('🛑 Stopping frontend...');
      this.frontendProcess.kill('SIGTERM');
    }
    
    setTimeout(() => {
      process.exit(0);
    }, 2000);
  }

  // Main startup sequence
  async start() {
    console.log('🎯 Crypto Graphs Simple Startup Manager');
    console.log('=======================================\n');

    // Start backend
    await this.startBackend();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      this.cleanup();
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      this.cleanup();
    });
  }
}

// Start the application
const startupManager = new SimpleStartupManager();
startupManager.start().catch(error => {
  console.error('❌ Startup failed:', error);
  process.exit(1);
}); 