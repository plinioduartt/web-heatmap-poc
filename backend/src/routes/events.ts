import express from 'express';
import { pool } from '../db';

const router = express.Router();

router.post('/heatmap/events', async (req, res) => {
    const apiKey = req.headers['api-key'];
    if (apiKey !== 'test') return res.status(401).json({ message: 'Unauthorized' });

    const body = req.body;
    const values = body.map((item: any) => [
        item.site,
        item.page,
        item.isMobile,
        Buffer.from(item.events, 'base64')
    ]);

    try {
        await pool.query(
            `INSERT INTO binary_events (site, path, is_mobile, compressed_data) VALUES ${values.map(
                (_: any, i: number) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
            ).join(', ')}`,
            values.flat()
        );
        res.status(201).json({ message: 'OK' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Insert failed' });
    }
});

router.get('/heatmap/events', async (req, res) => {
    const { site, page, isMobile, from, to } = req.query;

    if (!site || !page || !isMobile || !from || !to) {
        return res.status(400).json({ message: 'Missing query parameters' });
    }

    try {
        const result = await pool.query(
            `SELECT compressed_data FROM binary_events 
       WHERE site = $1 AND path = $2 AND is_mobile = $3 
       AND created_at >= $4 AND created_at <= $5`,
            [site, page, isMobile === 'true', from, to]
        );

        const data = result.rows.map(row => ({
            compressed_data: Buffer.from(row.compressed_data).toString('base64')
        }));

        res.json({ data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error while listing traces' });
    }
});

export default router;
