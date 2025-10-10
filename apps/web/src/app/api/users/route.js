import sql from "@/app/api/utils/sql";
import { requireAuth, getAuthenticatedUser } from "@/app/api/utils/auth";

// Create or get current user profile
export async function POST(request) {
  try {
    const session = await requireAuth();
    const { username, full_name } = await request.json();

    if (!username) {
      return Response.json({ error: "Username is required" }, { status: 400 });
    }

    // Check if user already has a profile
    const existingUser = await sql`
      SELECT id, username, email, full_name, created_at
      FROM users
      WHERE email = ${session.user.email}
    `;

    if (existingUser.length > 0) {
      return Response.json(
        { error: "User profile already exists" },
        { status: 409 },
      );
    }

    const result = await sql`
      INSERT INTO users (username, email, full_name)
      VALUES (${username}, ${session.user.email}, ${full_name || null})
      RETURNING id, username, email, full_name, created_at
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.message === "Authentication required") {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    if (error.code === "23505") {
      // Unique constraint violation
      return Response.json(
        { error: "Username already exists" },
        { status: 409 },
      );
    }
    return Response.json({ error: "Failed to create user" }, { status: 500 });
  }
}

// Get current user profile
export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user?.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userProfile = await sql`
      SELECT id, username, email, full_name, created_at
      FROM users
      WHERE email = ${user.email}
    `;

    if (userProfile.length === 0) {
      return Response.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    return Response.json(userProfile[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    return Response.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
