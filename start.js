const { spawn } = require('child_process');
const { Pool } = require('pg');
const net = require('net');
require('dotenv').config();

class StartupManager {
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

  // Check if PostgreSQL is running and accessible
  async checkDatabase() {
    console.log('🔍 Checking database connectivity...');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database is accessible');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('\n🔧 Please ensure:');
      console.log('   1. PostgreSQL is installed and running');
      console.log('   2. Database "crypto_graphs" exists');
      console.log('   3. User "postgres" with password "postgres" exists');
      console.log('   4. .env file has correct DATABASE_URL');
      return false;
    } finally {
      await pool.end();
    }
  }

  // Start the backend server
  async startBackend() {
    console.log('🚀 Starting backend server...');
    
    // Check if default port is available, if not find another
    if (!(await this.isPortAvailable(this.backendPort))) {
      this.backendPort = await this.findAvailablePort(this.backendPort + 1);
      console.log(`⚠️  Port 5000 is in use, using port ${this.backendPort} instead`);
    }
    
    // Set the port environment variable
    process.env.PORT = this.backendPort;
    
    this.backendProcess = spawn('node', ['server.js'], {
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
    console.log('🎯 Crypto Graphs Startup Manager');
    console.log('================================\n');

    // Check if .env file exists
    if (!process.env.DATABASE_URL) {
      console.error('❌ .env file not found or DATABASE_URL not set');
      console.log('📝 Please create a .env file based on env.example');
      process.exit(1);
    }

    // Check database connectivity
    const dbOk = await this.checkDatabase();
    if (!dbOk) {
      process.exit(1);
    }

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
const startupManager = new StartupManager();
startupManager.start().catch(error => {
  console.error('❌ Startup failed:', error);
  process.exit(1);
}); 