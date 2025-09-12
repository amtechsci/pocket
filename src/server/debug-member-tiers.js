const fs = require('fs');
const path = require('path');

// Read the schema file
const schemaPath = path.join(__dirname, '../../member_tiers_update_fixed.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

console.log('📋 Schema file content length:', schema.length);
console.log('📋 First 200 characters:');
console.log(schema.substring(0, 200));

// Split the schema into individual statements
const allStatements = schema.split(';');
console.log(`\n📊 Total statements after split: ${allStatements.length}`);

const statements = allStatements
  .map(stmt => stmt.trim())
  .filter(stmt => {
    const hasContent = stmt.length > 0;
    const isComment = stmt.startsWith('--');
    console.log(`Statement ${allStatements.indexOf(stmt) + 1}: "${stmt.substring(0, 50)}..." - Length: ${stmt.length}, HasContent: ${hasContent}, IsComment: ${isComment}`);
    return hasContent && !isComment;
  });

console.log(`\n📊 Found ${statements.length} valid statements:`);
statements.forEach((stmt, index) => {
  console.log(`${index + 1}. ${stmt.substring(0, 80)}...`);
});

// Check for CREATE TABLE statements
const createTableStatements = statements.filter(stmt => 
  stmt.toUpperCase().includes('CREATE TABLE')
);

console.log(`\n📊 Found ${createTableStatements.length} CREATE TABLE statements:`);
createTableStatements.forEach((stmt, index) => {
  const tableName = stmt.match(/CREATE TABLE (\w+)/i)?.[1];
  console.log(`${index + 1}. ${tableName}`);
});
