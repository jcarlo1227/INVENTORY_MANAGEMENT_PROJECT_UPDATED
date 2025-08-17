const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function testInventoryUpdate() {
  console.log('🧪 Testing Inventory Update Function...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ No DATABASE_URL found');
    return;
  }
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('📡 Connecting to database...');
    
    // Test basic connection
    const testResult = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Check if inventory_items table exists
    console.log('🔍 Checking inventory_items table...');
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
    
    console.log('✅ Inventory items table exists');
    
    // Check table structure
    const structure = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'inventory_items'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Table structure:');
    structure.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Get a sample item to test with
    console.log('🔍 Finding a sample item to test with...');
    const sampleItem = await sql`
      SELECT id, item_code, product_name, total_quantity, status
      FROM inventory_items 
      LIMIT 1
    `;
    
    if (sampleItem.length === 0) {
      console.log('❌ No inventory items found to test with');
      return;
    }
    
    const testItem = sampleItem[0];
    console.log('✅ Found test item:', testItem);
    
    // Test updating the item
    console.log('🧪 Testing update function...');
    
    const updateData = {
      total_quantity: testItem.total_quantity + 1,
      status: 'active'
    };
    
    console.log('📤 Update data:', updateData);
    
    // Test the update directly
    const updateResult = await sql`
      UPDATE inventory_items 
      SET total_quantity = ${updateData.total_quantity}, 
          status = ${updateData.status}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${testItem.id}
      RETURNING *
    `;
    
    if (updateResult.length > 0) {
      console.log('✅ Update successful!');
      console.log('📊 Updated item:', updateResult[0]);
      
      // Revert the change
      console.log('🔄 Reverting test change...');
      await sql`
        UPDATE inventory_items 
        SET total_quantity = ${testItem.total_quantity}, 
            status = ${testItem.status}, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${testItem.id}
      `;
      console.log('✅ Test change reverted');
      
    } else {
      console.log('❌ Update failed - no rows affected');
    }
    
    console.log('✅ Inventory update test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the test
testInventoryUpdate().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});