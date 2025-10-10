import sql from '@/app/api/utils/sql';

// Get user by username
export async function GET(request, { params }) {
  try {
    const { username } = params;
    
    const user = await sql`
      SELECT id, username, email, full_name, created_at
      FROM users
      WHERE username = ${username}
    `;

    if (user.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json(user[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return Response.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// Update user by username
export async function PUT(request, { params }) {
  try {
    const { username } = params;
    const { email, full_name } = await request.json();

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (email !== undefined) {
      setClauses.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (full_name !== undefined) {
      setClauses.push(`full_name = $${paramIndex}`);
      values.push(full_name);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(username);

    const query = `
      UPDATE users 
      SET ${setClauses.join(', ')}
      WHERE username = $${paramIndex}
      RETURNING id, username, email, full_name, updated_at
    `;

    const result = await sql(query, values);

    if (result.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return Response.json({ error: 'Failed to update user' }, { status: 500 });
  }
}