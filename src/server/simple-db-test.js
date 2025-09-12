const mysql = require('mysql2/promise');

async function testConnection() {
  let connection;
  
  try {
    console.log('🔌 Testing MySQL database connection...');
    console.log('📍 Host: 13.235.194.211');
    console.log('🗄️  Database: pocket');
    console.log('👤 User: pocket');
    
    // Simple connection without pool
    connection = await mysql.createConnection({
      host: '13.235.194.211',
      user: 'pocket',
      password: 'Pocket@9988',
      database: 'pocket',
      port: 3306,
      connectTimeout: 30000,
      acquireTimeout: 30000,
      timeout: 30000
    });
    
    console.log('✅ Connected to MySQL database successfully!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Database query test successful:', rows);
    
    // Check if tables exist
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📋 Found ${tables.length} tables in database`);
    
    if (tables.length > 0) {
      console.log('📊 Existing tables:');
      tables.forEach(table => {
        console.log(`  - ${Object.values(table)[0]}`);
      });
    } else {
      console.log('📊 Database is empty - ready for schema setup');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ETIMEDOUT') {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Check if the server IP is accessible from your network');
      console.log('2. Verify the database credentials are correct');
      console.log('3. Ensure MySQL is running on port 3306');
      console.log('4. Check firewall settings');
    }
    
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 Database connection test successful!');
      console.log('✅ Ready to set up the database schema');
      process.exit(0);
    } else {
      console.log('\n❌ Database connection test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error.message);
    process.exit(1);
  });
