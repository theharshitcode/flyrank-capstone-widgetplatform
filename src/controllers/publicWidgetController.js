const pool = require("../config/db");

async function getPublicWidget(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, type, title, description, fields,
              button_text, display_options, version
       FROM widgets
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Widget not found." });
    }

    const widget = result.rows[0];

    res.set({
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      "ETag": `"widget-${widget.id}-v${widget.version}"`,
    });

    return res.status(200).json({ widget });
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(400).json({ error: "Invalid widget ID." });
    }

    console.error("Public widget config error:", error.message);
    return res.status(500).json({ error: "Could not load widget." });
  }
}

module.exports = { getPublicWidget };
