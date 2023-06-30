import sqlite3 from 'sqlite3';

export interface ReadingsModel {
    id?: number;
    stream_id: string;
    temperature: number;
    humidity: number;
    date: Date;
}

export class DatabaseManager {
    private db: sqlite3.Database;

    constructor(databasePath: string) {
        this.db = new sqlite3.Database(databasePath);
        this.createReadingsTable();
    }

    private createReadingsTable() {
        const query = `
      CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        stream_id TEXT,
        temperature REAL,
        humidity REAL,
        date DATETIME
      )
    `;
        this.db.run(query, (err) => {
            if (err) {
                console.error('Failed to create readings table:', err);
            }
        });
    }

    public getAllReadings(callback: (error: Error | null, rows?: any[]) => void) {
        const query = `SELECT * FROM readings`;
        this.db.all(query, callback);
    }

    public getReadingById(id: number, callback: (error: Error | null, row?: any) => void) {
        const query = `SELECT * FROM readings WHERE id = ?`;
        this.db.get(query, id, callback);
    }

    public insertReading(reading: ReadingsModel, callback: (error: Error | null) => void) {
        const { stream_id, temperature, humidity, date } = reading;
        const query = `INSERT INTO readings (stream_id, temperature, humidity, date) VALUES (?, ?, ?, ?)`;
        this.db.run(query, [stream_id, temperature, humidity, date.toISOString()], callback);
    }

    public updateReading(id: number, reading: ReadingsModel, callback: (error: Error | null) => void) {
        const { stream_id, temperature, humidity, date } = reading;
        const query = `UPDATE readings SET stream_id = ?, temperature = ?, humidity = ?, date = ? WHERE id = ?`;
        this.db.run(query, [stream_id, temperature, humidity, date, id], callback);
    }

    public deleteReading(id: number, callback: (error: Error | null) => void) {
        const query = `DELETE FROM readings WHERE id = ?`;
        this.db.run(query, id, callback);
    }

    public truncateReadingsTable(callback: (error: Error | null) => void) {
        const query = `DELETE FROM readings`;
        this.db.run(query, callback);
    }
}
