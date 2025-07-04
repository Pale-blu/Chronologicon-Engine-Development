const fs = require('fs');
const readline = require('readline');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});
// Normalized parser (no UUID validation)
function parseLineWithHeader(headers, line, lineNumber) {
    const values = line.trim().split('|');

    if (values.length !== headers.length) {
        throw new Error(`Malformed entry at line ${lineNumber}`);
    }

    const row = {};
    headers.forEach((key, i) => {
        const normalizedKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(); // camelCase to snake_case
        row[normalizedKey] = values[i];
    });

    const event_id = row.event_id; // no validation
    const event_name = row.event_name;
    const description = row.description;
    const start_date = new Date(row.start_date);
    const end_date = new Date(row.end_date);
    const parent_event_id = row.parent_id !== 'NULL' ? row.parent_id : null;
    const research_value = row.research_value;

    if (isNaN(start_date) || isNaN(end_date)) throw new Error(`Invalid date at line ${lineNumber}`);

    const duration_minutes = Math.floor((end_date - start_date) / 60000);

    return {
        event_id,
        event_name,
        description,
        start_date,
        end_date,
        duration_minutes,
        parent_event_id,
        research_value,
        metadata: { line: lineNumber }
    };
}

async function parseFile(filePath, jobId, jobs) {
    const ext = path.extname(filePath).toLowerCase();

    jobs[jobId] = {
        status: 'PROCESSING',
        processedLines: 0,
        errorLines: 0,
        totalLines: 0,
        errors: [],
        startTime: new Date().toISOString()
    };

    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity
    });

    let headers = null;
    let lineNumber = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;

        lineNumber++;
        jobs[jobId].totalLines++;

        try {
            if (!headers) {
                headers = line.trim().split('|');
                continue; // skip header
            }

            const event = parseLineWithHeader(headers, line, lineNumber);

            await pool.query(`
        INSERT INTO historical_events (
          event_id, event_name, description, start_date, end_date,
          duration_minutes, parent_event_id, research_value, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (event_id) DO NOTHING`,
                [
                    event.event_id,
                    event.event_name,
                    event.description,
                    event.start_date,
                    event.end_date,
                    event.duration_minutes,
                    event.parent_event_id,
                    event.research_value,
                    event.metadata
                ]
            );

            jobs[jobId].processedLines++;
        } catch (err) {
            jobs[jobId].errorLines++;
            jobs[jobId].errors.push(`Line ${lineNumber}: ${err.message}`);
        }
    }

    jobs[jobId].status = 'COMPLETED';
    jobs[jobId].endTime = new Date().toISOString();
}

module.exports = { parseFile };
