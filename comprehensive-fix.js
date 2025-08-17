const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function comprehensiveFix() {
  console.log('🔧 Comprehensive Database and Code Fix');
  console.log('=====================================\n');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ No DATABASE_URL found in environment variables');
    return;
  }
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('📡 Testing database connection...');
    const testResult = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful\n');
    
    // Fix 1: Notifications table
    console.log('1️⃣ Fixing Notifications Table...');
    try {
      // Check if table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
        )
      `;
      
      if (tableExists[0]?.exists) {
        console.log('   📋 Table exists, checking structure...');
        
        // Check ID column
        const idColumn = await sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications' 
          AND column_name = 'id'
        `;
        
        if (idColumn.length > 0 && !idColumn[0].column_default) {
          console.log('   ⚠️ ID column not properly configured, recreating...');
          
          // Backup data
          const existingData = await sql`SELECT * FROM notifications`;
          console.log(`   💾 Backing up ${existingData.length} notifications...`);
          
          // Drop and recreate
          await sql`DROP TABLE notifications CASCADE`;
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
          
          // Restore data
          if (existingData.length > 0) {
            for (const notification of existingData) {
              await sql`
                INSERT INTO notifications (title, message, type, created_at, is_read)
                VALUES (${notification.title}, ${notification.message}, ${notification.type}, ${notification.created_at}, ${notification.is_read})
              `;
            }
            console.log(`   ✅ Restored ${existingData.length} notifications`);
          }
        } else {
          console.log('   ✅ ID column properly configured');
        }
      } else {
        console.log('   ➕ Creating notifications table...');
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
        console.log('   ✅ Notifications table created');
      }
      
      // Test insert
      const testNotification = await sql`
        INSERT INTO notifications (title, message, type)
        VALUES ('Test Fix', 'Testing notifications table fix', 'info')
        RETURNING id
      `;
      
      if (testNotification[0]?.id) {
        console.log('   ✅ Test insert successful, ID:', testNotification[0].id);
        await sql`DELETE FROM notifications WHERE id = ${testNotification[0].id}`;
        console.log('   🧹 Test notification cleaned up');
      }
      
    } catch (error) {
      console.error('   ❌ Failed to fix notifications:', error.message);
    }
    
    console.log('');
    
    // Fix 2: Inventory items table
    console.log('2️⃣ Checking Inventory Items Table...');
    try {
      const inventoryExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'inventory_items'
        )
      `;
      
      if (inventoryExists[0]?.exists) {
        console.log('   ✅ Inventory items table exists');
        
        // Check for required columns
        const columns = await sql`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'inventory_items'
          ORDER BY ordinal_position
        `;
        
        const requiredColumns = ['id', 'status', 'total_quantity', 'updated_at'];
        const missingColumns = requiredColumns.filter(col => 
          !columns.find(c => c.column_name === col)
        );
        
        if (missingColumns.length > 0) {
          console.log(`   ⚠️ Missing columns: ${missingColumns.join(', ')}`);
          
          // Add missing columns
          for (const col of missingColumns) {
            try {
              if (col === 'status') {
                await sql`ALTER TABLE inventory_items ADD COLUMN status VARCHAR(50) DEFAULT 'active'`;
                console.log(`   ➕ Added ${col} column`);
              } else if (col === 'updated_at') {
                await sql`ALTER TABLE inventory_items ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`;
                console.log(`   ➕ Added ${col} column`);
              }
            } catch (addError) {
              console.log(`   ⚠️ Could not add ${col} column:`, addError.message);
            }
          }
        } else {
          console.log('   ✅ All required columns present');
        }
        
        // Check data consistency
        console.log('   🔄 Checking data consistency...');
        
        // Update null statuses
        const nullStatusUpdate = await sql`
          UPDATE inventory_items 
          SET status = 'active' 
          WHERE status IS NULL
        `;
        if (nullStatusUpdate.count > 0) {
          console.log(`   ✅ Updated ${nullStatusUpdate.count} items with null status`);
        }
        
        // Update status based on quantity
        const zeroQuantityUpdate = await sql`
          UPDATE inventory_items 
          SET status = 'out of stock' 
          WHERE total_quantity = 0 AND status != 'out of stock'
        `;
        if (zeroQuantityUpdate.count > 0) {
          console.log(`   ✅ Updated ${zeroQuantityUpdate.count} items with 0 quantity to out of stock`);
        }
        
        const activeUpdate = await sql`
          UPDATE inventory_items 
          SET status = 'active' 
          WHERE total_quantity > 0 AND status != 'active'
        `;
        if (activeUpdate.count > 0) {
          console.log(`   ✅ Updated ${activeUpdate.count} items with > 0 quantity to active`);
        }
        
      } else {
        console.log('   ❌ Inventory items table does not exist');
      }
      
    } catch (error) {
      console.error('   ❌ Failed to check inventory:', error.message);
    }
    
    console.log('');
    
    // Fix 3: Test the system
    console.log('3️⃣ Testing System...');
    try {
      // Test notifications
      console.log('   🧪 Testing notifications...');
      const notificationTest = await sql`
        INSERT INTO notifications (title, message, type)
        VALUES ('System Test', 'Testing system after fixes', 'info')
        RETURNING id, title, message, type
      `;
      
      if (notificationTest[0]?.id) {
        console.log('   ✅ Notifications working, ID:', notificationTest[0].id);
        await sql`DELETE FROM notifications WHERE id = ${notificationTest[0].id}`;
      }
      
      // Test inventory update (if table exists)
      const inventoryExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'inventory_items'
        )
      `;
      
      if (inventoryExists[0]?.exists) {
        console.log('   🧪 Testing inventory structure...');
        const itemCount = await sql`SELECT COUNT(*) as count FROM inventory_items`;
        console.log(`   ✅ Inventory table accessible, ${itemCount[0]?.count || 0} items`);
      }
      
    } catch (error) {
      console.error('   ❌ System test failed:', error.message);
    }
    
    console.log('\n=====================================');
    console.log('✅ Comprehensive fix completed');
    
  } catch (error) {
    console.error('❌ Comprehensive fix failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
  }
}

// Run the comprehensive fix
comprehensiveFix().then(() => {
  console.log('🏁 All fixes completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fixes failed:', error);
  process.exit(1);
});