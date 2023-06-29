import { Bind, DataCaptureThreadConfig } from '@aixpand/client';

@DataCaptureThreadConfig()
export class SensiboCapture {
    @Bind('LIVE_FEED')
    isLive: boolean = true;

    @Bind('RECONNECTABLE')
    reconnect: boolean = true;

    @Bind('CAP_RESOLUTION')
    rate: number = 0.5;

    @Bind('TYPE')
    type: string = 'SensiboSimple'

    @Bind('SENSIBO_DEVICE_NAME')
    device: string;

    @Bind('SENSIBO_API_KEY')
    apiKey: string;

    @Bind('URL')
    url: string = '';

    constructor(device: string, apiKey: string) {
        this.device = device;
        this.apiKey = apiKey;
    }
}
