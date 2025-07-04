const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');
const { parseFile } = require('../utils/parser');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

const jobs = {};

exports.ingestFromUpload = (req, res) => {
    const filePath = req.file.path;
    const jobId = `ingest-job-${uuidv4()}`;
    parseFile(filePath, jobId, jobs);
    res.status(202).json({
        status: 'Ingestion initiated',
        jobId,
        message: `Check /api/events/ingestion-status/${jobId} for updates.`
    });
};

exports.ingestFromPath = (req, res) => {
    const { filePath } = req.body;
    const jobId = `ingest-job-${uuidv4()}`;
    parseFile(filePath, jobId, jobs); // ✅ use parseFile directly
    res.status(202).json({
        status: 'Ingestion initiated',
        jobId,
        message: `Check /api/events/ingestion-status/${jobId} for updates.`
    });
};

exports.getIngestionStatus = (req, res) => {
    const job = jobs[req.params.jobId];
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.status(200).json(job);
};

exports.getAllEvents = async (req, res) => {
    const result = await pool.query('SELECT * FROM historical_events ORDER BY start_date');
    res.json(result.rows);
};

exports.getEventById = async (req, res) => {
    const result = await pool.query('SELECT * FROM historical_events WHERE event_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
};

async function buildTimeline(eventId) {
    const eventResult = await pool.query('SELECT * FROM historical_events WHERE event_id = $1', [eventId]);
    if (eventResult.rows.length === 0) return null;
    const event = eventResult.rows[0];

    const childrenResult = await pool.query('SELECT event_id FROM historical_events WHERE parent_event_id = $1', [eventId]);
    const children = [];
    for (let row of childrenResult.rows) {
        const childTree = await buildTimeline(row.event_id);
        if (childTree) children.push(childTree);
    }
    return { ...event, children };
}

exports.getTimeline = async (req, res) => {
    const timeline = await buildTimeline(req.params.id);
    if (!timeline) return res.status(404).json({ error: 'Timeline not found' });
    res.json(timeline);
};

exports.searchEvents = async (req, res) => {
    const { name, start_date_after, end_date_before, sortBy = 'start_date', sortOrder = 'asc', page = 1, limit = 10 } = req.query;
    let where = [];
    let params = [];

    if (name) {
        params.push(`%${name.toLowerCase()}%`);
        where.push(`LOWER(event_name) LIKE $${params.length}`);
    }
    if (start_date_after) {
        params.push(start_date_after);
        where.push(`start_date > $${params.length}`);
    }
    if (end_date_before) {
        params.push(end_date_before);
        where.push(`end_date < $${params.length}`);
    }

    const offset = (page - 1) * limit;
    const query = `
    SELECT * FROM historical_events
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ${limit} OFFSET ${offset}
  `;
    const result = await pool.query(query, params);
    res.json({ page, limit: parseInt(limit), events: result.rows });
};

exports.getOverlappingEvents = async (req, res) => {
    const events = (await pool.query('SELECT * FROM historical_events')).rows;
    const overlaps = [];

    for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
            const a = events[i], b = events[j];
            if (a.start_date < b.end_date && b.start_date < a.end_date) {
                const overlapDuration = Math.min(a.end_date, b.end_date) - Math.max(a.start_date, b.start_date);
                overlaps.push({
                    overlappingEventPairs: [a, b],
                    overlap_duration_minutes: Math.floor(overlapDuration / 60000)
                });
            }
        }
    }
    res.json(overlaps);
};

exports.getTemporalGaps = async (req, res) => {
    const { startDate, endDate } = req.query;
    const events = (await pool.query(
        'SELECT * FROM historical_events WHERE start_date >= $1 AND end_date <= $2 ORDER BY start_date',
        [startDate, endDate])).rows;

    if (events.length < 2) return res.json({ largestGap: null, message: "No significant temporal gaps found." });

    let maxGap = 0, gapInfo = null;
    for (let i = 0; i < events.length - 1; i++) {
        const gap = new Date(events[i + 1].start_date) - new Date(events[i].end_date);
        if (gap > maxGap) {
            maxGap = gap;
            gapInfo = {
                startOfGap: events[i].end_date,
                endOfGap: events[i + 1].start_date,
                durationMinutes: Math.floor(gap / 60000),
                precedingEvent: events[i],
                succeedingEvent: events[i + 1]
            };
        }
    }

    res.json({ largestGap: gapInfo, message: gapInfo ? "Largest temporal gap identified." : "No significant temporal gaps found." });
};

exports.getEventInfluencePath = async (req, res) => {
    const { from, to } = req.query;
    const allEvents = (await pool.query('SELECT * FROM historical_events')).rows;
    const graph = {};
    allEvents.forEach(ev => {
        if (!graph[ev.parent_event_id]) graph[ev.parent_event_id] = [];
        graph[ev.parent_event_id].push(ev);
    });

    const queue = [{ node: from, path: [], total: 0 }];
    const visited = new Set();

    while (queue.length) {
        const { node, path, total } = queue.shift();
        if (node === to) {
            const fullPath = [...path, node];
            const detailed = await Promise.all(fullPath.map(id =>
                pool.query('SELECT * FROM historical_events WHERE event_id = $1', [id])
                    .then(res => res.rows[0])
            ));
            return res.json({
                from, to,
                total_duration: detailed.reduce((sum, ev) => sum + ev.duration_minutes, 0),
                path: detailed
            });
        }
        visited.add(node);
        const children = graph[node] || [];
        for (let child of children) {
            if (!visited.has(child.event_id)) {
                queue.push({
                    node: child.event_id,
                    path: [...path, node],
                    total: total + child.duration_minutes
                });
            }
        }
    }

    res.status(404).json({ error: 'No influence path found.' });
};
