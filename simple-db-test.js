const { Pool } = require('pg');

// Hardcoded database configuration for testing
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'crypto_graphs',
  user: 'postgres',
  password: 'postgres',
  ssl: false
});

async function testSimpleConnection() {
  console.log('🔍 Testing simple database connection...\n');
  
  console.log('📋 Connection Configuration:');
  console.log('Host: localhost');
  console.log('Port: 5432');
  console.log('Database: crypto_graphs');
  console.log('User: postgres');
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

    // Check if database exists and has tables
    console.log('📋 Checking database structure...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('ℹ️ No tables found. Database is empty.');
      console.log('💡 Run the main application to initialize the schema.');
    } else {
      console.log('✅ Tables found:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
    console.log('');
    console.log('🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Make sure PostgreSQL is installed and running');
    console.log('2. Check if PostgreSQL service is started');
    console.log('3. Verify the database "crypto_graphs" exists');
    console.log('4. Check if user "postgres" has the correct password');
    console.log('');
    console.log('📝 Common solutions:');
    console.log('• Start PostgreSQL service: sudo service postgresql start');
    console.log('• Create database: createdb crypto_graphs');
    console.log('• Connect to PostgreSQL: psql -U postgres');
    console.log('• Create database via psql: CREATE DATABASE crypto_graphs;');
  } finally {
    await pool.end();
  }
}

// Run the test
testSimpleConnection(); 