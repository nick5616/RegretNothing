import sql from '@/app/api/utils/sql';

// Create a new claim
export async function POST(request) {
  try {
    const { item_id, claimer_name, claimer_email } = await request.json();

    if (!item_id || !claimer_name) {
      return Response.json({ 
        error: 'item_id and claimer_name are required' 
      }, { status: 400 });
    }

    // Check if item exists and is a wishlist item
    const item = await sql`
      SELECT id, item_type FROM items WHERE id = ${item_id}
    `;

    if (item.length === 0) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item[0].item_type !== 'wishlist') {
      return Response.json({ error: 'Can only claim wishlist items' }, { status: 400 });
    }

    // Check if item is already claimed
    const existingClaim = await sql`
      SELECT id FROM claims WHERE item_id = ${item_id}
    `;

    if (existingClaim.length > 0) {
      return Response.json({ error: 'Item is already claimed' }, { status: 409 });
    }

    const result = await sql`
      INSERT INTO claims (item_id, claimer_name, claimer_email)
      VALUES (${item_id}, ${claimer_name}, ${claimer_email || null})
      RETURNING *
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error('Error creating claim:', error);
    return Response.json({ error: 'Failed to create claim' }, { status: 500 });
  }
}

// Get claims for items
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const item_id = searchParams.get('item_id');
    const username = searchParams.get('username');

    let query = `
      SELECT c.*, i.title, i.description, u.username
      FROM claims c
      JOIN items i ON c.item_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (item_id) {
      query += ` AND c.item_id = $${paramIndex}`;
      values.push(item_id);
      paramIndex++;
    }

    if (username) {
      query += ` AND u.username = $${paramIndex}`;
      values.push(username);
      paramIndex++;
    }

    query += ` ORDER BY c.claimed_at DESC`;

    const claims = await sql(query, values);
    return Response.json(claims);
  } catch (error) {
    console.error('Error fetching claims:', error);
    return Response.json({ error: 'Failed to fetch claims' }, { status: 500 });
  }
}