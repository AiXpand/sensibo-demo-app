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
    console.log(payload);
    readings.push(payload); // write to db

    responses++;
    if(responses == 5) {
        console.log('Closing pipeline!');
        context.pipeline.close();
    }
});

// ===============================================================

const app: Application = express();
const PORT = process.env.APP_PORT;

const readings = [];

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', function (req: Request, res: Response) {
    res.render('views/index');
});

app.get('/readings', function (req: Request, res: Response) {
    res.json(readings);  // read from db
});

let commandSent = false;
app.post('/', bodyParser.json(), (req: Request, res: Response): void => {
    if (connectedToEngine && !commandSent) {
        commandSent = true;
        const sensiboFactory = new SensiboPluginFactory();

        const pipeline = client
            .createPipeline(preferredNode, new SensiboCapture(req.body.device, req.body.apiKey))
            .attachPluginInstance(sensiboFactory.makePluginInstance('sensibo-demo'));

        console.log('will deploy!');

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
