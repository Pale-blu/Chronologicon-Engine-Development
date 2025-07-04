const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const controller = require('../controllers/eventController');

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: API for managing historical events
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all historical events
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: A list of historical events
 */
router.get('/events', controller.getAllEvents);

/**
 * @swagger
 * /api/events/ingest:
 *   post:
 *     summary: Ingest historical events from a file upload
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       202:
 *         description: Ingestion started
 */
router.post('/events/ingest', upload.single('file'), controller.ingestFromUpload);

/**
 * @swagger
 * /api/events/ingest_path:
 *   post:
 *     summary: Ingest historical events from a file path on the server
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filePath:
 *                 type: string
 *     responses:
 *       202:
 *         description: Ingestion started from path
 */
router.post('/events/ingest_path', controller.ingestFromPath);

/**
 * @swagger
 * /api/events/ingestion-status/{jobId}:
 *   get:
 *     summary: Get ingestion job status
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ingestion job status
 */
router.get('/events/ingestion-status/:jobId', controller.getIngestionStatus);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get a specific event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The event
 */
router.get('/events/:id', controller.getEventById);

/**
 * @swagger
 * /api/timeline/{id}:
 *   get:
 *     summary: Get a timeline for an event and its children
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Timeline hierarchy
 */
router.get('/timeline/:id', controller.getTimeline);

/**
 * @swagger
 * /api/events/search:
 *   get:
 *     summary: Search events by name, date range, etc.
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *       - in: query
 *         name: start_date_after
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date_before
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/events/search', controller.searchEvents);

/**
 * @swagger
 * /api/insights/overlapping-events:
 *   get:
 *     summary: Get overlapping events
 *     tags: [Insights]
 *     responses:
 *       200:
 *         description: Overlapping event pairs
 */
router.get('/insights/overlapping-events', controller.getOverlappingEvents);

/**
 * @swagger
 * /api/insights/temporal-gaps:
 *   get:
 *     summary: Get the largest temporal gap between events
 *     tags: [Insights]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Gap info
 */
router.get('/insights/temporal-gaps', controller.getTemporalGaps);

/**
 * @swagger
 * /api/insights/event-influence:
 *   get:
 *     summary: Get influence path from one event to another
 *     tags: [Insights]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Influence path
 */
router.get('/insights/event-influence', controller.getEventInfluencePath);

module.exports = router;
