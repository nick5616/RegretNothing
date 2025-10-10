import sql from '@/app/api/utils/sql';

// Create a new group gift contribution
export async function POST(request) {
  try {
    const { item_id, contributor_name, contributor_email, amount } = await request.json();

    if (!item_id || !contributor_name || !amount || amount <= 0) {
      return Response.json({ 
        error: 'item_id, contributor_name, and positive amount are required' 
      }, { status: 400 });
    }

    // Check if item exists, is a wishlist item, and has group gifting enabled
    const item = await sql`
      SELECT id, item_type, group_gift_enabled, group_gift_target
      FROM items 
      WHERE id = ${item_id}
    `;

    if (item.length === 0) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item[0].item_type !== 'wishlist') {
      return Response.json({ error: 'Can only contribute to wishlist items' }, { status: 400 });
    }

    if (!item[0].group_gift_enabled) {
      return Response.json({ error: 'Group gifting is not enabled for this item' }, { status: 400 });
    }

    // Get current total contributions
    const currentTotal = await sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM group_gift_contributions
      WHERE item_id = ${item_id}
    `;

    const currentAmount = parseFloat(currentTotal[0].total) || 0;
    const target = parseFloat(item[0].group_gift_target);
    const newTotal = currentAmount + parseFloat(amount);

    if (newTotal > target) {
      return Response.json({ 
        error: `Contribution would exceed target. Remaining: $${(target - currentAmount).toFixed(2)}` 
      }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO group_gift_contributions (item_id, contributor_name, contributor_email, amount)
      VALUES (${item_id}, ${contributor_name}, ${contributor_email || null}, ${amount})
      RETURNING *
    `;

    // Return the contribution with updated totals
    const response = {
      ...result[0],
      total_raised: newTotal,
      target_amount: target,
      remaining: target - newTotal
    };

    return Response.json(response);
  } catch (error) {
    console.error('Error creating contribution:', error);
    return Response.json({ error: 'Failed to create contribution' }, { status: 500 });
  }
}

// Get contributions for items
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const item_id = searchParams.get('item_id');
    const username = searchParams.get('username');

    let query = `
      SELECT gc.*, i.title, i.description, i.group_gift_target, u.username
      FROM group_gift_contributions gc
      JOIN items i ON gc.item_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (item_id) {
      query += ` AND gc.item_id = $${paramIndex}`;
      values.push(item_id);
      paramIndex++;
    }

    if (username) {
      query += ` AND u.username = $${paramIndex}`;
      values.push(username);
      paramIndex++;
    }

    query += ` ORDER BY gc.contributed_at DESC`;

    const contributions = await sql(query, values);
    return Response.json(contributions);
  } catch (error) {
    console.error('Error fetching contributions:', error);
    return Response.json({ error: 'Failed to fetch contributions' }, { status: 500 });
  }
}