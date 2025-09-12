const { testConnection } = require('./utils/mysqlDatabase');

console.log('🔌 Testing MySQL database connection...');
console.log('📍 Host: 13.235.194.211');
console.log('🗄️  Database: pocket');
console.log('👤 User: pocket');

testConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 Database connection test successful!');
      console.log('✅ Ready to set up the database schema');
      process.exit(0);
    } else {
      console.log('\n❌ Database connection test failed!');
      console.log('🔧 Please check your database credentials and network connection');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Error testing database connection:', error.message);
    process.exit(1);
  });
