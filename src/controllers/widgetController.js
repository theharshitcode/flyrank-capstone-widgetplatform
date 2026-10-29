const { z } = require("zod");
const pool = require("../config/db");

const widgetSchema = z.object({
  type: z.enum(["signup", "contact", "cta"]),
  title: z.string().trim().min(1).max(120),
  description: z.string().max(1000).nullable().optional(),
  fields: z.array(z.record(z.string(), z.unknown())).max(30).optional(),
  button_text: z.string().trim().min(1).max(60).optional(),
  display_options: z.record(z.string(), z.unknown()).optional(),
}).strict();

function validateWidget(body) {
  return widgetSchema.safeParse(body);
}

function sendValidationError(res, result) {
  return res.status(400).json({
    error: "Invalid widget data.",
    details: result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}

async function createWidget(req, res) {
  const parsed = validateWidget(req.body);

  if (!parsed.success) return sendValidationError(res, parsed);

  const data = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO widgets
        (owner_id, type, title, description, fields, button_text, display_options)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        data.type,
        data.title,
        data.description ?? null,
        JSON.stringify(data.fields ?? []),
        data.button_text ?? "Submit",
        JSON.stringify(data.display_options ?? {}),
      ]
    );

    return res.status(201).json({ widget: result.rows[0] });
  } catch (error) {
    console.error("Create widget error:", error.message);
    return res.status(500).json({ error: "Could not create widget." });
  }
}

async function listWidgets(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM widgets
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({ widgets: result.rows });
  } catch (error) {
    console.error("List widgets error:", error.message);
    return res.status(500).json({ error: "Could not fetch widgets." });
  }
}

async function getWidget(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM widgets WHERE id = $1 AND owner_id = $2",
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Widget not found." });
    }

    return res.status(200).json({ widget: result.rows[0] });
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(400).json({ error: "Invalid widget ID." });
    }

    console.error("Get widget error:", error.message);
    return res.status(500).json({ error: "Could not fetch widget." });
  }
}

async function updateWidget(req, res) {
  const parsed = validateWidget(req.body);

  if (!parsed.success) return sendValidationError(res, parsed);

  const data = parsed.data;

  try {
    const result = await pool.query(
      `UPDATE widgets
       SET type = $1,
           title = $2,
           description = $3,
           fields = $4,
           button_text = $5,
           display_options = $6,
           version = version + 1,
           updated_at = NOW()
       WHERE id = $7 AND owner_id = $8
       RETURNING *`,
      [
        data.type,
        data.title,
        data.description ?? null,
        JSON.stringify(data.fields ?? []),
        data.button_text ?? "Submit",
        JSON.stringify(data.display_options ?? {}),
        req.params.id,
        req.user.id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Widget not found." });
    }

    return res.status(200).json({ widget: result.rows[0] });
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(400).json({ error: "Invalid widget ID." });
    }

    console.error("Update widget error:", error.message);
    return res.status(500).json({ error: "Could not update widget." });
  }
}

async function deleteWidget(req, res) {
  try {
    const result = await pool.query(
      "DELETE FROM widgets WHERE id = $1 AND owner_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Widget not found." });
    }

    return res.status(200).json({ message: "Widget deleted successfully." });
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(400).json({ error: "Invalid widget ID." });
    }

    console.error("Delete widget error:", error.message);
    return res.status(500).json({ error: "Could not delete widget." });
  }
}

module.exports = {
  createWidget,
  listWidgets,
  getWidget,
  updateWidget,
  deleteWidget,
};
