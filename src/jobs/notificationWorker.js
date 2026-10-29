
require("dotenv").config();

const pool = require("../config/db");

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 5;

async function claimJob() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Select one available job and lock it against competing workers.
    const result = await client.query(
      `SELECT id, submission_id, attempts, max_attempts
       FROM notification_jobs
       WHERE (
         status = 'pending'
         AND next_attempt_at <= NOW()
       ) OR (
         status = 'processing'
         AND locked_at < NOW() - INTERVAL '5 minutes'
       )
       ORDER BY created_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1`
    );

    if (result.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }

    const job = result.rows[0];
    const nextAttempt = job.attempts + 1;

    // Persist the claim and increment the attempt exactly once.
    await client.query(
      `UPDATE notification_jobs
       SET status = 'processing',
           attempts = $2,
           locked_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [job.id, nextAttempt]
    );

    await client.query("COMMIT");

    return { ...job, attempts: nextAttempt };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function processJob(job) {
  try {
    const result = await pool.query(
      `SELECT s.id, s.data, s.country, s.city, w.title
       FROM submissions s
       JOIN widgets w ON w.id = s.widget_id
       WHERE s.id = $1`,
      [job.submission_id]
    );

    if (result.rowCount === 0) {
      throw new Error("Submission no longer exists.");
    }

    // Placeholder until real email/webhook delivery is configured.
    console.log("Notification job processed:", {
      jobId: job.id,
      submissionId: job.submission_id,
      widgetTitle: result.rows[0].title,
    });

    await pool.query(
      `UPDATE notification_jobs
       SET status = 'completed',
           locked_at = NULL,
           last_error = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [job.id]
    );
  } catch (error) {
    const exhausted =
      job.attempts >= Math.min(job.max_attempts, MAX_ATTEMPTS);

    const delaySeconds = Math.min(300, 2 ** job.attempts * 5);

    await pool.query(
      `UPDATE notification_jobs
       SET status = $2,
           locked_at = NULL,
           next_attempt_at = NOW() + ($3 * INTERVAL '1 second'),
           last_error = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [
        job.id,
        exhausted ? "failed" : "pending",
        delaySeconds,
        String(error.message).slice(0, 1000),
      ]
    );

    if (exhausted) {
      console.error("ALERT: notification job exhausted retries", {
        jobId: job.id,
        error: error.message,
      });
    } else {
      console.warn("Notification job will retry", {
        jobId: job.id,
        attempt: job.attempts,
        error: error.message,
      });
    }
  }
}

async function runWorker() {
  console.log("Notification worker started.");

  while (true) {
    try {
      const job = await claimJob();

      if (job) {
        await processJob(job);
      } else {
        await new Promise((resolve) =>
          setTimeout(resolve, POLL_INTERVAL_MS)
        );
      }
    } catch (error) {
      console.error("Notification worker error:", error.message);

      await new Promise((resolve) =>
        setTimeout(resolve, POLL_INTERVAL_MS)
      );
    }
  }
}

runWorker().catch((error) => {
  console.error("Worker stopped:", error);
  process.exitCode = 1;
});
