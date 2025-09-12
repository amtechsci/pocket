const mysql = require('mysql2/promise');

console.log('🔍 Database Connection Troubleshooting Guide\n');

console.log('📋 Current Configuration:');
console.log('  Host: 13.235.194.211');
console.log('  Port: 3306');
console.log('  User: pocket');
console.log('  Database: pocket\n');

console.log('🔧 Troubleshooting Steps:\n');

console.log('1. ✅ Security Group Rule Added');
console.log('   - IPv4, MYSQL/Aurora, TCP, 3306');
console.log('   - This looks correct!\n');

console.log('2. ⏳ Wait for Propagation');
console.log('   - Security group changes can take 1-2 minutes to propagate');
console.log('   - Please wait a few minutes and try again\n');

console.log('3. 🔍 Check MySQL Service Status');
console.log('   - SSH into your server: ssh -i your-key.pem ubuntu@13.235.194.211');
console.log('   - Check MySQL status: sudo systemctl status mysql');
console.log('   - Start MySQL if needed: sudo systemctl start mysql\n');

console.log('4. 🔧 Check MySQL Configuration');
console.log('   - Edit MySQL config: sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf');
console.log('   - Ensure bind-address is set to: bind-address = 0.0.0.0');
console.log('   - Restart MySQL: sudo systemctl restart mysql\n');

console.log('5. 👤 Verify Database and User');
console.log('   - Connect locally: mysql -u root -p');
console.log('   - Create database: CREATE DATABASE IF NOT EXISTS pocket;');
console.log('   - Create user: CREATE USER "pocket"@"%" IDENTIFIED BY "Pocket@9988";');
console.log('   - Grant permissions: GRANT ALL PRIVILEGES ON pocket.* TO "pocket"@"%";');
console.log('   - Flush privileges: FLUSH PRIVILEGES;\n');

console.log('6. 🔥 Check Firewall (if using UFW)');
console.log('   - Check status: sudo ufw status');
console.log('   - Allow MySQL: sudo ufw allow 3306\n');

console.log('7. 📍 Verify Server IP');
console.log('   - Check if the server IP changed');
console.log('   - Run on server: curl ifconfig.me\n');

console.log('🔄 Let\'s test the connection now...\n');

async function testConnection() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: '13.235.194.211',
      user: 'pocket',
      password: 'Pocket@9988',
      database: 'pocket',
      port: 3306,
      connectTimeout: 10000,
      acquireTimeout: 10000
    });
    
    console.log('✅ SUCCESS! Database connection established!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test, NOW() as current_time');
    console.log('✅ Query test successful:', rows[0]);
    
    return true;
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Still timing out. Please check:');
      console.log('   - Is MySQL service running on the server?');
      console.log('   - Is MySQL configured to accept external connections?');
      console.log('   - Are there any firewall rules blocking the connection?');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Access denied. Please check:');
      console.log('   - Username and password are correct');
      console.log('   - User has permissions to access the database');
      console.log('   - User is allowed to connect from external hosts');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n💡 Database not found. Please check:');
      console.log('   - Database "pocket" exists on the server');
      console.log('   - User has access to the database');
    }
    
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 Database is ready! You can now run:');
      console.log('   npm run setup-remote-db');
    } else {
      console.log('\n🔧 Please follow the troubleshooting steps above.');
      console.log('   Once fixed, run this script again to test.');
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error.message);
  });
