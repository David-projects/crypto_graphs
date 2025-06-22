const { pool, initDatabase } = require('./config/database');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');
  
  // Display connection configuration
  console.log('📋 Connection Configuration:');
  console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`Port: ${process.env.DB_PORT || 5432}`);
  console.log(`Database: ${process.env.DB_NAME || 'crypto_graphs'}`);
  console.log(`User: ${process.env.DB_USER || 'postgres'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');

  try {
    // Test basic connection
    console.log('🔌 Testing basic connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test query
    console.log('📊 Testing query execution...');
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Query execution successful!');
    console.log(`Current time: ${result.rows[0].current_time}`);
    console.log(`PostgreSQL version: ${result.rows[0].postgres_version.split(' ')[0]}`);
    
    client.release();
    console.log('');

    // Initialize database schema
    console.log('🏗️ Initializing database schema...');
    await initDatabase();
    console.log('✅ Database schema initialized successfully!');
    console.log('');

    // Verify tables were created
    console.log('📋 Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'transactions', 'portfolio', 'moving_averages', 'settings', 'logs')
      ORDER BY table_name
    `);
    
    console.log('✅ Tables found:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('');
    console.log('🎉 Database connection and setup completed successfully!');
    console.log('🚀 Your crypto trading app is ready to use!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    console.log('');
    console.log('🔧 Troubleshooting tips:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Check your .env file configuration');
    console.log('3. Verify database credentials');
    console.log('4. Ensure the database "crypto_graphs" exists');
    console.log('');
    console.log('📝 To create the database, run:');
    console.log('   createdb crypto_graphs');
    console.log('   OR');
    console.log('   psql -c "CREATE DATABASE crypto_graphs;"');
  } finally {
    await pool.end();
  }
}

// Run the test
testDatabaseConnection(); 