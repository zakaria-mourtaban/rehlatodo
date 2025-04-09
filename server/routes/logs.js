import express from "express";
import { Log } from "../models/index.js";
import sequelize from "../database/config.js";
import { Op } from 'sequelize';

const router = express.Router();

// Get all logs grouped by date for logged-in user
router.get("/", async (req, res) => {
	try {
		const userId = req.user.userId;

		// Query to get logs grouped by date for the user
		const logs = await sequelize.query(
			`
      SELECT 
        TO_CHAR("created_at", 'YYYY-MM-DD') as date,
        json_agg(
          json_build_object(
            'id', id,
            'card_id', "cardId",
            'card_title', "cardTitle",
            'action_type', "actionType",
            'from_column', "fromColumn",
            'to_column', "toColumn",
            'from_position', "fromPosition",
            'to_position', "toPosition",
            'created_at', "created_at"
          ) ORDER BY "created_at" DESC
        ) as logs
      FROM logs
      WHERE "userId" = :userId
      GROUP BY TO_CHAR("created_at", 'YYYY-MM-DD')
      ORDER BY date DESC
    `,
			{
				replacements: { userId },
				type: sequelize.QueryTypes.SELECT,
			}
		);

		res.json(logs);
	} catch (err) {
		console.error("Error fetching logs:", err);
		res.status(500).json({ error: "Server error" });
	}
});

// Get logs for a specific date
router.get("/date/:date", async (req, res) => {
	try {
		const { date } = req.params;
		const userId = req.user.userId;

		// Validate date format (YYYY-MM-DD)
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			return res
				.status(400)
				.json({ error: "Invalid date format. Use YYYY-MM-DD" });
		}

		const logs = await Log.findAll({
			where: {
				userId,
				created_at: {
					[Op.gte]: new Date(`${date}T00:00:00.000Z`),
					[sequelize.Op.lt]: new Date(`${date}T23:59:59.999Z`),
				},
			},
			order: [["created_at", "DESC"]],
		});

		res.json(logs);
	} catch (err) {
		console.error(`Error fetching logs for date ${req.params.date}:`, err);
		res.status(500).json({ error: "Server error" });
	}
});

// Get logs for a specific card
router.get("/card/:cardId", async (req, res) => {
	try {
		const { cardId } = req.params;
		const userId = req.user.userId;

		const logs = await Log.findAll({
			where: {
				cardId,
				userId,
			},
			order: [["created_at", "DESC"]],
		});

		res.json(logs);
	} catch (err) {
		console.error(
			`Error fetching logs for card ${req.params.cardId}:`,
			err
		);
		res.status(500).json({ error: "Server error" });
	}
});

// Get a summary of recent logs for dashboard
router.get("/summary", async (req, res) => {
	try {
		const userId = req.user.userId;

		// Get logs from the last 7 days, limited to most recent 20
		const logs = await Log.findAll({
			where: {
				userId,
				created_at: {
					[Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
				},
			},
			order: [["created_at", "DESC"]],
			limit: 20,
		});

		res.json(logs);
	} catch (err) {
		console.error("Error fetching logs summary:", err);
		res.status(500).json({ error: "Server error" });
	}
});


router.get('/readable', async (req, res) => {
	try {
	  const userId = req.user.userId;
	  
	  // Using snake_case column names and COALESCE to handle NULL values
	  const logs = await sequelize.query(`
		SELECT 
		  id,
		  COALESCE("card_title", 'Untitled Card') as card_title,
		  TO_CHAR("created_at", 'YYYY-MM-DD') as date,
		  CASE
			WHEN "action_type" = 'created' THEN
			  '"' || COALESCE("card_title", 'Untitled Card') || '" was created in "' || COALESCE("to_column", 'Unknown Column') || '"'
			WHEN "action_type" = 'deleted' THEN
			  '"' || COALESCE("card_title", 'Untitled Card') || '" was deleted from "' || COALESCE("from_column", 'Unknown Column') || '"'
			WHEN "action_type" = 'moved_column' THEN
			  '"' || COALESCE("card_title", 'Untitled Card') || '" was moved from "' || COALESCE("from_column", 'Unknown Column') || '" to "' || COALESCE("to_column", 'Unknown Column') || '"'
			WHEN "action_type" = 'moved_up' THEN
			  '"' || COALESCE("card_title", 'Untitled Card') || '" was moved up within the column "' || COALESCE("from_column", 'Unknown Column') || '"' 
			WHEN "action_type" = 'moved_down' THEN
			  '"' || COALESCE("card_title", 'Untitled Card') || '" was moved down within the column "' || COALESCE("from_column", 'Unknown Column') || '"'
			ELSE
			  '"' || COALESCE("card_title", 'Untitled Card') || '" was updated'
		  END as description,
		  "created_at"
		FROM logs
		WHERE "user_id" = :userId
		ORDER BY "created_at" DESC
	  `, {
		replacements: { userId },
		type: sequelize.QueryTypes.SELECT
	  });
	  
	  res.json(logs);
	} catch (err) {
	  console.error('Error fetching readable logs:', err);
	  res.status(500).json({ error: 'Server error', details: err.message });
	}
  });

export default router;
