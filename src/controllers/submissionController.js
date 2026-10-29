const pool = require("../config/db");
const { getGeolocation } = require("../services/geolocationService");
const MAX_FIELDS = 30;
const MAX_VALUE_LENGTH = 1000;

async function createSubmission(req, res) {
  const widgetId = req.params.id;
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ error: "Request body must be a JSON object." });
  }

  // Honeypot: legitimate forms must leave this hidden field empty.
  if (typeof body.website_url === "string" && body.website_url.trim()) {
    return res.status(400).json({ error: "Invalid submission." });
  }

  const data = body.data;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({ error: "A data object is required." });
  }

  const entries = Object.entries(data);

  if (entries.length === 0 || entries.length > MAX_FIELDS) {
    return res.status(400).json({
      error: `Provide between 1 and ${MAX_FIELDS} form fields.`,
    });
  }

  for (const [key, value] of entries) {
    if (
      !key.trim() ||
      key.length > 100 ||
      typeof value !== "string" ||
      value.length > MAX_VALUE_LENGTH
    ) {
      return res.status(400).json({
        error: "Each field must have a valid name and a string value of at most 1000 characters.",
      });
    }
  }

  try {
    // Public visitors may submit only to an existing widget.
    const widgetResult = await pool.query(
      "SELECT id, owner_id, fields FROM widgets WHERE id = $1",
      [widgetId]
    );

    if (widgetResult.rowCount === 0) {
      return res.status(404).json({ error: "Widget not found." });
    }

    const widget = widgetResult.rows[0];
    const configuredFields = Array.isArray(widget.fields) ? widget.fields : [];

    // Only accept fields configured for this widget.
    const allowedNames = new Set(
      configuredFields
        .filter((field) => field && typeof field.name === "string")
        .map((field) => field.name)
    );

    if (entries.some(([key]) => !allowedNames.has(key))) {
      return res.status(400).json({
        error: "Submission contains an unknown form field.",
      });
    }

    for (const field of configuredFields) {
      if (
        field &&
        field.required === true &&
        (!Object.prototype.hasOwnProperty.call(data, field.name) ||
          data[field.name].trim() === "")
      ) {
        return res.status(400).json({
          error: `The ${field.name} field is required.`,
        });
      }
    }

    const location = await getGeolocation(req.ip);

const client = await pool.connect();

let result;

try {
  await client.query("BEGIN");

  result = await client.query(
    `INSERT INTO submissions
       (widget_id, owner_id, data, country, city)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, widget_id, data, country, city, created_at`,
    [
      widget.id,
      widget.owner_id,
      JSON.stringify(data),
      location.country,
      location.city,
    ]
  );

  await client.query(
    `INSERT INTO notification_jobs (submission_id)
     VALUES ($1)
     ON CONFLICT (submission_id) DO NOTHING`,
    [result.rows[0].id]
  );

  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
}

    return res.status(201).json({
      message: "Submission received.",
      submission: result.rows[0],
    });
  } catch (error) {
    if (error.code === "22P02") {
      return res.status(400).json({ error: "Invalid widget ID." });
    }

    console.error("Submission error:", error.message);
    return res.status(500).json({ error: "Could not process submission." });
  }
}

module.exports = { createSubmission };
