const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function fixInventoryDatabase() {
  console.log('🔧 Fixing inventory database issues...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ No DATABASE_URL found');
    return;
  }
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // 1. Ensure inventory_items table has the right structure
    console.log('🔍 Checking inventory_items table structure...');
    
    try {
      // Check if the table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'inventory_items'
        )
      `;
      
      if (!tableExists[0]?.exists) {
        console.log('❌ Inventory items table does not exist');
        return;
      }
      
      // Check if status column exists
      const statusColumnExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'inventory_items' 
          AND column_name = 'status'
        )
      `;
      
      if (!statusColumnExists[0]?.exists) {
        console.log('➕ Adding status column to inventory_items...');
        await sql`ALTER TABLE inventory_items ADD COLUMN status VARCHAR(50) DEFAULT 'active'`;
        console.log('✅ Status column added');
      }
      
      // Check if updated_at column exists
      const updatedAtColumnExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'inventory_items' 
          AND column_name = 'updated_at'
        )
      `;
      
      if (!updatedAtColumnExists[0]?.exists) {
        console.log('➕ Adding updated_at column to inventory_items...');
        await sql`ALTER TABLE inventory_items ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
        console.log('✅ Updated_at column added');
      }
      
      // Update any items with null status to 'active'
      console.log('🔄 Updating items with null status...');
      const nullStatusUpdate = await sql`
        UPDATE inventory_items 
        SET status = 'active' 
        WHERE status IS NULL
      `;
      console.log(`✅ Updated ${nullStatusUpdate.count || 0} items with null status`);
      
      // Update any items with 0 quantity to 'out of stock'
      console.log('🔄 Updating items with 0 quantity to out of stock...');
      const zeroQuantityUpdate = await sql`
        UPDATE inventory_items 
        SET status = 'out of stock' 
        WHERE total_quantity = 0 AND status != 'out of stock'
      `;
      console.log(`✅ Updated ${zeroQuantityUpdate.count || 0} items with 0 quantity`);
      
      // Update any items with > 0 quantity to 'active'
      console.log('🔄 Updating items with > 0 quantity to active...');
      const activeUpdate = await sql`
        UPDATE inventory_items 
        SET status = 'active' 
        WHERE total_quantity > 0 AND status != 'active'
      `;
      console.log(`✅ Updated ${activeUpdate.count || 0} items with > 0 quantity`);
      
    } catch (error) {
      console.error('❌ Error fixing inventory table:', error);
    }
    
    // 2. Ensure notifications table exists and has right structure
    console.log('🔍 Checking notifications table...');
    
    try {
      const notificationsTableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
        )
      `;
      
      if (!notificationsTableExists[0]?.exists) {
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
      } else {
        console.log('✅ Notifications table already exists');
      }
      
    } catch (error) {
      console.error('❌ Error with notifications table:', error);
    }
    
    console.log('✅ Database fixes completed');
    
  } catch (error) {
    console.error('❌ Failed to fix database:', error);
  }
}

// Run the fix
fixInventoryDatabase().then(() => {
  console.log('🏁 Fix completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fix failed:', error);
  process.exit(1);
});