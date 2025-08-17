#!/usr/bin/env node

// Simple database connection test script
// Run with: node test-db.js

const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function testDatabase() {
  console.log('🔍 Testing database connection and tables...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ No DATABASE_URL found in environment variables');
    return;
  }
  
  try {
    console.log('📡 Connecting to database...');
    const sql = neon(process.env.DATABASE_URL);
    
    // Test basic connection
    console.log('🧪 Testing basic connection...');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Basic connection successful:', result);
    
    // Check if notifications table exists
    console.log('🔍 Checking notifications table...');
    try {
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
        )
      `;
      
      if (tableCheck[0]?.exists) {
        console.log('✅ Notifications table exists');
        
        // Check table structure
        const structure = await sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'notifications'
          ORDER BY ordinal_position
        `;
        
        console.log('📋 Table structure:', structure);
      } else {
        console.log('❌ Notifications table does not exist, creating it...');
        
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
        
        console.log('✅ Notifications table created successfully');
      }
    } catch (tableError) {
      console.error('❌ Error with notifications table:', tableError);
    }
    
    // Check inventory_items table
    console.log('🔍 Checking inventory_items table...');
    try {
      const inventoryCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'inventory_items'
        )
      `;
      
      if (inventoryCheck[0]?.exists) {
        console.log('✅ Inventory items table exists');
        
        // Check table structure
        const structure = await sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'inventory_items'
          ORDER BY ordinal_position
        `;
        
        console.log('📋 Inventory table structure:', structure);
        
        // Test a simple query
        const count = await sql`SELECT COUNT(*) as count FROM inventory_items`;
        console.log('📊 Total inventory items:', count[0]?.count);
      } else {
        console.log('❌ Inventory items table does not exist');
      }
    } catch (inventoryError) {
      console.error('❌ Error with inventory table:', inventoryError);
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

// Run the test
testDatabase().then(() => {
  console.log('🏁 Database test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});