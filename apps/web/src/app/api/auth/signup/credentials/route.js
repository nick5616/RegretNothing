import sql from "@/app/api/utils/sql";
import { hash } from "argon2";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const callbackUrl = formData.get("callbackUrl") || "/";

    if (!email || !password) {
      return new Response("Missing email or password", { status: 400 });
    }

    if (password.length < 6) {
      return new Response("Password must be at least 6 characters long", {
        status: 400,
      });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM auth_users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return new Response("EmailCreateAccount", { status: 400 });
    }

    // Hash password
    const hashedPassword = await hash(password);

    // Create user in auth_users table
    const newUser = await sql`
      INSERT INTO auth_users (email, name)
      VALUES (${email}, ${email.split("@")[0]})
      RETURNING id, email, name
    `;

    // Create credentials account record
    await sql`
      INSERT INTO auth_accounts ("userId", type, provider, "providerAccountId", password)
      VALUES (${newUser[0].id}, 'credentials', 'credentials', ${newUser[0].id}, ${hashedPassword})
    `;

    // Create user profile in the users table
    const username =
      email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") + newUser[0].id;
    await sql`
      INSERT INTO users (username, email, full_name)
      VALUES (${username}, ${email}, ${email.split("@")[0]})
    `;

    // Return success response instead of redirect for AJAX handling
    return Response.json(
      {
        success: true,
        message: "Account created successfully",
        redirectUrl: `/account/signin?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Signup error:", error);
    if (error.code === "23505") {
      return new Response("EmailCreateAccount", { status: 400 });
    }
    return new Response("Internal server error", { status: 500 });
  }
}
