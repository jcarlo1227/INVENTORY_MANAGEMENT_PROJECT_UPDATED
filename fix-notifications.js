const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function fixNotificationsTable() {
  console.log('🔧 Fixing notifications table ID issue...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ No DATABASE_URL found in environment variables');
    return;
  }
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('📡 Connecting to database...');
    
    // Test connection
    const testResult = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Check if notifications table exists
    console.log('🔍 Checking notifications table...');
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      )
    `;
    
    if (tableExists[0]?.exists) {
      console.log('✅ Notifications table exists');
      
      // Check the current structure
      const structure = await sql`
        SELECT column_name, data_type, is_nullable, column_default, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
        ORDER BY ordinal_position
      `;
      
      console.log('📋 Current table structure:');
      structure.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
      });
      
      // Check if ID column has proper SERIAL setup
      const idColumn = structure.find(col => col.column_name === 'id');
      
      if (idColumn && !idColumn.column_default) {
        console.log('⚠️ ID column is not properly set up as SERIAL, fixing...');
        
        // Backup existing data
        console.log('💾 Backing up existing notifications...');
        const existingData = await sql`SELECT * FROM notifications`;
        console.log(`   Found ${existingData.length} existing notifications`);
        
        // Drop and recreate the table
        console.log('🗑️ Dropping old table...');
        await sql`DROP TABLE notifications CASCADE`;
        
        console.log('🏗️ Creating new table with proper SERIAL ID...');
        await sql`
          CREATE TABLE notifications (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) DEFAULT 'info',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_read BOOLEAN DEFAULT FALSE
          )
        `;
        
        console.log('✅ New notifications table created');
        
        // Restore data if any existed
        if (existingData.length > 0) {
          console.log('🔄 Restoring existing notifications...');
          for (const notification of existingData) {
            await sql`
              INSERT INTO notifications (title, message, type, created_at, is_read)
              VALUES (${notification.title}, ${notification.message}, ${notification.type}, ${notification.created_at}, ${notification.is_read})
            `;
          }
          console.log(`✅ Restored ${existingData.length} notifications`);
        }
        
      } else {
        console.log('✅ ID column is properly configured');
      }
      
    } else {
      console.log('➕ Creating notifications table...');
      await sql`
        CREATE TABLE notifications (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'info',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_read BOOLEAN DEFAULT FALSE
        )
      `;
      console.log('✅ Notifications table created');
    }
    
    // Test inserting a notification
    console.log('🧪 Testing notification insertion...');
    const testNotification = await sql`
      INSERT INTO notifications (title, message, type)
      VALUES ('Test Notification', 'This is a test notification', 'info')
      RETURNING id, title, message, type, created_at, is_read
    `;
    
    if (testNotification[0]?.id) {
      console.log('✅ Test notification inserted successfully with ID:', testNotification[0].id);
      
      // Clean up test notification
      await sql`DELETE FROM notifications WHERE id = ${testNotification[0].id}`;
      console.log('🧹 Test notification cleaned up');
    } else {
      console.log('❌ Test notification failed');
    }
    
    console.log('✅ Notifications table fix completed successfully');
    
  } catch (error) {
    console.error('❌ Failed to fix notifications table:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      detail: error.detail
    });
  }
}

// Run the fix
fixNotificationsTable().then(() => {
  console.log('🏁 Fix completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fix failed:', error);
  process.exit(1);
});