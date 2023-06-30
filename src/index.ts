import express, { Application, Request, Response } from 'express';
import * as bodyParser from 'body-parser';
import path from 'path';
import * as dotenv from 'dotenv';
import * as process from 'process';
import {
    AiXpandClient,
    AiXpandClientEvent,
    AiXpandClientOptions,
    AiXPMessage,
    AiXPNotificationData,
} from '@aixpand/client';
import { BasicSensiboConfig, SENSIBO_SIGNATURE, SensiboPayload, SensiboPluginFactory } from './sensibo.plugin';
import { SensiboCapture } from './sensibo.dct';
import {DatabaseManager} from "./database/database.manager";

dotenv.config();

// ===============================================================

const preferredNode = process.env.AIXPAND_NODE;
const aixpOptions: AiXpandClientOptions = {
    mqtt: {
        protocol: process.env.MQTT_PROTOCOL,
        host: process.env.MQTT_HOST,
        port: parseInt(process.env.MQTT_PORT),
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        session: {
            clean: true,
            clientId: null,
        },
    },
    name: 'sensibo-demo',
    fleet: [preferredNode],
    plugins: {
        [`${SENSIBO_SIGNATURE}`]: {
            instanceConfig: BasicSensiboConfig,
            payload: SensiboPayload,
        },
    },
};

const client = new AiXpandClient(aixpOptions);
client.boot();

const databaseManager = new DatabaseManager(path.join(__dirname, 'database.db'));

let connectedToEngine = false;
client.on(AiXpandClientEvent.AIXP_RECEIVED_HEARTBEAT_FROM_ENGINE, (data) => {
    if (data.executionEngine === preferredNode) {
        if (!connectedToEngine) {
            console.log('connected to', data.executionEngine);
        }

        connectedToEngine = true;
    }
});

let responses = 0;
client.on(SENSIBO_SIGNATURE, (context, err, payload: SensiboPayload) => {
    if (!err) {
        const dateJson = JSON.parse(payload.date.replace(/'/g, '"'));
        const readingDate = new Date(dateJson.time);
        databaseManager.insertReading({
            stream_id: context.pipeline.dct.id,
            temperature: payload.temperature,
            humidity: payload.humidity,
            date: readingDate
        }, (error) => {
            if (error) {
                console.error('Failed to insert reading into database:', error);
            }
        });
    }

    responses++;
    if(responses == 5) {
        console.log('Closing pipeline!');
        context.pipeline.close();
    }
});

// ===============================================================

const app: Application = express();
const PORT = process.env.APP_PORT;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', function (req: Request, res: Response) {
    res.render('index');
});

// ar trebui sa aiba o limita de date returnate?
app.get('/readings', function (req: Request, res: Response) {
    databaseManager.getAllReadings((error, rows) => {
        if (error) {
            console.error('Failed to get readings from database:', error);
            res.json([]);
        } else {
            res.json(rows);
        }
    });
});

app.get('/chart', function (req: Request, res: Response) {
    databaseManager.getAllReadings((error, rows) => {
        if (error) {
            console.error('Failed to get readings from database:', error);
            res.json([]);
            return;
        }

        const jsonData = rows;
        const temperatures = jsonData.map(entry => entry.temperature);
        const humidity = jsonData.map(entry => entry.humidity);

        const datasets = [
            {
                label: 'Temperature',
                data: temperatures,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            },
            {
                label: 'Humidity',
                data: humidity,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }
        ];

        res.json(datasets);
    });
});

let commandSent = false;
app.post('/', bodyParser.json(), (req: Request, res: Response): void => {
    if (connectedToEngine && !commandSent) {
        commandSent = true;
        const sensiboFactory = new SensiboPluginFactory();

        const pipeline = client
            .createPipeline(preferredNode, new SensiboCapture(req.body.device, req.body.apiKey))
            .attachPluginInstance(sensiboFactory.makePluginInstance('sensibo-demo'));

        pipeline.deploy().then(
            (response: AiXPMessage<AiXPNotificationData>) => {
                console.log(response.data.notification);
            },
            (err) => {
                console.log(err);
                client.removePipeline(pipeline);
            },
        );
    }

    res.json({
        status: 'OK',
    })
});

app.listen(PORT, (): void => {
    console.log('SERVER IS UP ON PORT:', PORT);
});



// ===================================================================
// Logging for debug purposes:
client.on(AiXpandClientEvent.AIXP_CLIENT_BOOTED, (err, status) => {
    console.log('CLIENT SUCCESSFULLY BOOTED!');
});

client.on(AiXpandClientEvent.AIXP_CLIENT_SYS_TOPIC_SUBSCRIBE, (err, data) => {
    if (err) {
        console.error(err);

        return;
    }

    console.log(data);
});
