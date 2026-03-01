const pool = require('../database');

async function getUserByEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email');
  }
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
}


async function getUserById(id) {
    if (!id || typeof id !== 'number') {
        throw new Error('Invalid user ID');
    }
    const [rows] = await pool.execute(
        `SELECT 
            users.id,
            users.name,
            users.email,
            users.password,
            users.salutation,
            users.country,
            users.created_at,
            GROUP_CONCAT(marketing_preferences.id ORDER BY marketing_preferences.id SEPARATOR ',') AS marketing_preference_ids
          FROM users
          LEFT JOIN user_marketing_preferences ON user_marketing_preferences.user_id = users.id
          LEFT JOIN marketing_preferences ON marketing_preferences.id = user_marketing_preferences.preference_id
          WHERE users.id = ?
          GROUP BY users.id, users.name, users.email, users.password, users.salutation, users.country, users.created_at`,
        [id]
    );

    if (rows.length === 0) {
        return undefined;
    }

    const user = {
        id: rows[0].id,
        name: rows[0].name,
        email: rows[0].email,
        password: rows[0].password,
        salutation: rows[0].salutation,
        country: rows[0].country,
        created_at: rows[0].created_at
    };

    user.marketingPreferences = rows[0].marketing_preference_ids
        ? rows[0].marketing_preference_ids.split(',').map(id => parseInt(id))
        : [];

    return user;
}


async function createUser({ name, email, password, salutation, country, marketingPreferences }) {
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    throw new Error('Invalid user data');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insert user data
    const [userResult] = await connection.execute(
      `INSERT INTO users (name, email, password, salutation, country) VALUES (?, ?, ?, ?, ?)`,
      [name, email, password, salutation, country]
    );
    const userId = userResult.insertId;

    // Insert marketing preferences
    if (Array.isArray(marketingPreferences)) {
      for (let preference of marketingPreferences) {
        const numericPreferenceId = Number(preference);

        if (!numericPreferenceId || isNaN(numericPreferenceId)) {
          throw new Error(`Invalid marketing preference id: ${preference}`);
        }

        const [preferenceResult] = await connection.execute(
          `SELECT id FROM marketing_preferences WHERE id = ?`,
          [numericPreferenceId]
        );

        // Check if the preference exists
        if (preferenceResult.length === 0) {
          throw new Error(`Invalid marketing preference id: ${preference}`);
        }

        const preferenceId = preferenceResult[0].id;

        // Insert into user_marketing_preferences table
        await connection.execute(
          `INSERT INTO user_marketing_preferences (user_id, preference_id) VALUES (?, ?)`,
          [userId, preferenceId]
        );
      }
    }

    await connection.commit();
    return userId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateUser(id, { name, email, salutation, country, marketingPreferences }) {
  if (!id || typeof id !== 'number') {
    throw new Error('Invalid user ID');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Update user data
    await connection.execute(
      `UPDATE users SET name = ?, email = ?, salutation = ?, country = ? WHERE id = ?`,
      [name, email, salutation, country, id]
    );

    // Update marketing preferences by deleting existing ones and inserting new ones
    await connection.execute(`DELETE FROM user_marketing_preferences WHERE user_id = ?`, [id]);
    if (Array.isArray(marketingPreferences)) {
      for (const preference of marketingPreferences) {
        let preferenceId;

        // RegisterPage.jsx submits checkbox values as strings of preference IDs.
        // Only numeric IDs are accepted.
        const numericPreferenceId = Number(preference);

        if (!numericPreferenceId || isNaN(numericPreferenceId)) {
          throw new Error(`Invalid marketing preference id: ${preference}`);
        }

        const [preferenceResult] = await connection.execute(
          `SELECT id FROM marketing_preferences WHERE id = ?`,
          [numericPreferenceId]
        );

        if (preferenceResult.length === 0) {
          throw new Error(`Invalid marketing preference id: ${preference}`);
        }
        preferenceId = preferenceResult[0].id;

        await connection.execute(
          `INSERT INTO user_marketing_preferences (user_id, preference_id) VALUES (?, ?)`,
          [id, preferenceId]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteUser(id) {
  if (!id || typeof id !== 'number') {
    throw new Error('Invalid user ID');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Delete marketing preferences
    await connection.execute(`DELETE FROM user_marketing_preferences WHERE user_id = ?`, [id]);

    // Delete user
    await connection.execute(`DELETE FROM users WHERE id = ?`, [id]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};


