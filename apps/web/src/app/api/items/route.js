import sql from "@/app/api/utils/sql";
import { requireAuth, getAuthenticatedUser } from "@/app/api/utils/auth";

// Create a new item
export async function POST(request) {
  try {
    const session = await requireAuth();
    const {
      item_type,
      input_type,
      title,
      description,
      url,
      price,
      image_url,
      group_gift_enabled,
      group_gift_target,
    } = await request.json();

    if (!item_type || !input_type || !description) {
      return Response.json(
        {
          error: "item_type, input_type, and description are required",
        },
        { status: 400 },
      );
    }

    if (!["wishlist", "inventory"].includes(item_type)) {
      return Response.json(
        { error: "item_type must be wishlist or inventory" },
        { status: 400 },
      );
    }

    if (!["text", "url"].includes(input_type)) {
      return Response.json(
        { error: "input_type must be text or url" },
        { status: 400 },
      );
    }

    // Get the user profile
    const userProfile = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (userProfile.length === 0) {
      return Response.json(
        {
          error: "User profile not found. Please create a profile first.",
        },
        { status: 404 },
      );
    }

    const userId = userProfile[0].id;

    const result = await sql`
      INSERT INTO items (
        user_id, item_type, input_type, title, description, url, price, 
        image_url, group_gift_enabled, group_gift_target
      )
      VALUES (
        ${userId}, ${item_type}, ${input_type}, ${title || null}, ${description}, 
        ${url || null}, ${price || null}, ${image_url || null}, 
        ${group_gift_enabled || false}, ${group_gift_target || null}
      )
      RETURNING *
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error("Error creating item:", error);
    if (error.message === "Authentication required") {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    return Response.json({ error: "Failed to create item" }, { status: 500 });
  }
}

// Get all items (with optional filters)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const item_type = searchParams.get("item_type");
    const username = searchParams.get("username");
    const user = await getAuthenticatedUser();

    let query = `
      SELECT i.*, u.username, u.full_name,
             (SELECT COUNT(*) FROM claims c WHERE c.item_id = i.id) as claim_count,
             (SELECT SUM(amount) FROM group_gift_contributions gc WHERE gc.item_id = i.id) as contribution_total,
             (SELECT c.claimer_name FROM claims c WHERE c.item_id = i.id LIMIT 1) as claimer_name
      FROM items i 
      JOIN users u ON i.user_id = u.id 
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (username) {
      query += ` AND u.username = $${paramIndex}`;
      values.push(username);
      paramIndex++;
    }

    if (item_type) {
      query += ` AND i.item_type = $${paramIndex}`;
      values.push(item_type);
      paramIndex++;
    }

    // Privacy control: if viewing someone else's profile, only show wishlists
    if (user?.email && username) {
      const requestedUserProfile = await sql`
        SELECT id FROM users WHERE username = ${username} AND email = ${user.email}
      `;

      if (requestedUserProfile.length === 0) {
        // Not own profile, only show wishlists
        query += ` AND i.item_type = 'wishlist'`;
      }
    } else if (!user?.email) {
      // Not authenticated, only show wishlists
      query += ` AND i.item_type = 'wishlist'`;
    }

    query += ` ORDER BY i.created_at DESC`;

    const items = await sql(query, values);
    return Response.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return Response.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}
