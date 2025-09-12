const mysql = require('mysql2/promise');

async function testConnection() {
  let connection;
  
  try {
    console.log('🔌 Testing MySQL database connection...');
    
    connection = await mysql.createConnection({
      host: '13.235.194.211',
      user: 'pocket',
      password: 'Pocket@9988',
      database: 'pocket',
      port: 3306,
      connectTimeout: 10000
    });
    
    console.log('✅ SUCCESS! Database connection established!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test successful:', rows[0]);
    
    // Check existing tables
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
    console.error('❌ Connection failed:', error.message);
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
      console.log('\n🚀 Next step: Run "npm run setup-remote-db"');
    } else {
      console.log('\n❌ Database connection test failed!');
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error.message);
  });
