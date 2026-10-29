const pool = require("../config/db");

function parsePositiveInteger(value, fallback, max) {
  if (value === undefined) return fallback;

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;

  return Math.min(parsed, max);
}

async function listSubmissions(req, res) {
  const limit = parsePositiveInteger(req.query.limit, 20, 100);
  const page = parsePositiveInteger(req.query.page, 1, 1000000);
  const widgetId = req.query.widget_id;

  if (limit === null || page === null) {
    return res.status(400).json({
      error: "Page and limit must be positive integers.",
    });
  }

  if (
    widgetId !== undefined &&
    (typeof widgetId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(widgetId))
  ) {
    return res.status(400).json({ error: "Invalid widget_id." });
  }

  const offset = (page - 1) * limit;

  try {
    const values = [req.user.id];
    let filter = "owner_id = $1";

    if (widgetId) {
      values.push(widgetId);
      filter += ` AND widget_id = $${values.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM submissions
       WHERE ${filter}`,
      values
    );

    values.push(limit);
    values.push(offset);

    const result = await pool.query(
      `SELECT id, widget_id, data, country, city, created_at
       FROM submissions
       WHERE ${filter}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1}
       OFFSET $${values.length}`,
      values
    );

    return res.status(200).json({
      submissions: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        totalPages: Math.ceil(countResult.rows[0].total / limit),
      },
    });
  } catch (error) {
    console.error("List submissions error:", error.message);
    return res.status(500).json({
      error: "Could not fetch submissions.",
    });
  }
}

async function getAnalytics(req, res) {
  try {
    const [totalResult, widgetResult, dailyResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total_submissions
         FROM submissions
         WHERE owner_id = $1`,
        [req.user.id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total_widgets
         FROM widgets
         WHERE owner_id = $1`,
        [req.user.id]
      ),
      pool.query(
        `SELECT
           (created_at AT TIME ZONE 'UTC')::date::text AS date,
           COUNT(*)::int AS submissions
         FROM submissions
         WHERE owner_id = $1
           AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY (created_at AT TIME ZONE 'UTC')::date
         ORDER BY (created_at AT TIME ZONE 'UTC')::date`,
        [req.user.id]
      ),
    ]);

    return res.status(200).json({
      totalWidgets: widgetResult.rows[0].total_widgets,
      totalSubmissions: totalResult.rows[0].total_submissions,
      dailySubmissions: dailyResult.rows,
    });
  } catch (error) {
    console.error("Analytics error:", error.message);
    return res.status(500).json({
      error: "Could not fetch analytics.",
    });
  }
}

module.exports = { listSubmissions, getAnalytics };
